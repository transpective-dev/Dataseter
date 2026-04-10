import { Llama, getLlama, LlamaContext, LlamaModel, LlamaChat } from "node-llama-cpp";
import type { chunk_cont, extracted_data, session_execute_p } from "../../interface/session.interface.ts";
import { Prompts } from "../../utils/system_prompt.ts";
import { schema_builder } from "../../utils/utils.ts";
import { emitter } from "../../../emitter.ts";
import { configManager } from "../../../config-util.ts";

export interface agent_config {
    path: string,
    name: string,
    contextSize: number,
    cache: "F16" | "F32" | "Q8_0" | "Q4_0",
}

// llamamodel: for load model
// llamacontext: create space for context
// llamachatsession: manage session

import type { emit_token } from "../../interface/general.interface.ts";

export class Local_ClientManager {

    private static config: agent_config

    constructor(config: agent_config) {
        Local_ClientManager.config = config
    }

    private static agent: Llama
    private static model: LlamaModel
    private static context: LlamaContext

    public static loadProgress: number

    private static loadModel = async (config: agent_config) => {
        try {
            Local_ClientManager.model = await Local_ClientManager.agent.loadModel(
                {
                    modelPath: config.path,
                    onLoadProgress(loadProgress) {
                        Local_ClientManager.loadProgress = loadProgress
                    }
                })
            return { loadingStatus: true, prog: Local_ClientManager.loadProgress }
        } catch (e: any) {
            console.log('error while loading model: ', e)
            throw new Error(
                `
                loading_status: ${false}
                loading_progress: ${Local_ClientManager.loadProgress}
                Error_msg: ${e}
                `
            )
        }
    }

    public static emit_token: Map<string, emit_token> = new Map()

    private static setContext = async (ctx: number) => {
        Local_ClientManager.context = await Local_ClientManager.model.createContext({
            contextSize: ctx,
            experimentalKvCacheKeyType: Local_ClientManager.config.cache
        })
    }

    public static isInitialized(): boolean {
        return !!Local_ClientManager.agent && !!Local_ClientManager.model && !!Local_ClientManager.context;
    }

    public initialize = async (config: agent_config, ctx_size: number) => {

        if (Local_ClientManager.isInitialized()) {
            return;
        }

        // getllama
        if (!Local_ClientManager.agent) {
            Local_ClientManager.agent = await (async (): Promise<Llama> => {
                return await getLlama()
            })()
        }

        // set init config
        Local_ClientManager.config = config

        // load model
        const res_load_model = await Local_ClientManager.loadModel(config)

        if (res_load_model?.loadingStatus) {
            console.log('model loaded successfully')
        }

        // create init ctx pool with aggressive allocation fallback
        try {
            await Local_ClientManager.setContext(ctx_size);
        } catch (e: any) {
            if (e.message.includes('bad allocation') || e.message.includes('out of memory')) {
                console.warn('[Local] High precision allocation failed. Falling back to Q4_0 cache to preserve concurrency pool...');
                Local_ClientManager.config.cache = 'Q4_0';
                await Local_ClientManager.setContext(ctx_size);
            } else {
                throw e;
            }
        }

        console.log('[Local] Concurrent Context Pool Initialized:', Local_ClientManager.context.contextSize, 'tokens');

    }

    // Cache schema + grammar to avoid expensive rebuild per chunk
    private static cachedGrammar: any = null;
    private static cachedPrompt: string | null = null;

    public executeSingle = async (payload: chunk_cont): Promise<string> => {

        console.log('chunk_id: ' + payload.chunk_id + " " + new Date().toISOString())

        // Build schema + grammar once, reuse for all chunks
        if (!Local_ClientManager.cachedGrammar || !Local_ClientManager.cachedPrompt) {

            const full_schema = await schema_builder()
            Local_ClientManager.cachedPrompt = await Prompts.data_extraction()

            const schemaData = (full_schema as any).schema;
            const agent = Local_ClientManager.agent;
            const clean_properties: Record<string, any> = {};

            for (const [key, value] of Object.entries(schemaData.properties)) {
                const { description, requirement, exp, ...constraints } = value as any;

                // strip empty enum arrays — they break NLC grammar (no valid value allowed)
                if (constraints.enum && Array.isArray(constraints.enum) && constraints.enum.length === 0) {
                    delete constraints.enum;
                }

                clean_properties[key] = constraints;
            }

            Local_ClientManager.cachedGrammar = await agent.createGrammarForJsonSchema({
                type: 'array',
                items: {
                    type: 'object',
                    properties: clean_properties,
                    required: schemaData.required,
                    additionalProperties: false
                }
            });
        }

        const schema = Local_ClientManager.cachedGrammar;
        const prompt = Local_ClientManager.cachedPrompt!;
        const seq = Local_ClientManager.context.getSequence();

        const session = new LlamaChat({
            contextSequence: seq,
        })

        const {
            top_p, top_k, temperature, repeat_penalty
        } = configManager.getActiveConfig().model_preference

        try {

            const responseResult = await session.generateResponse([
                {
                    type: 'system',
                    text: prompt
                },
                {
                    type: 'user',
                    text: `provided_data: ${payload.content}`
                }
            ], {
                grammar: schema,
                onToken: (token) => {
                    const detokened = Local_ClientManager.model.detokenize(token);

                    if (Local_ClientManager.emit_token.has(payload.chunk_id)) {
                        
                        Local_ClientManager.emit_token.get(payload.chunk_id)!.token += detokened;
                        
                    } else {
                        Local_ClientManager.emit_token.set(payload.chunk_id, {
                            id: payload.chunk_id,
                            token: detokened
                        });
                    }

                    emitter.emit('token', Local_ClientManager.emit_token);
                },
                repeatPenalty: {
                    penalty: repeat_penalty
                },
                temperature: temperature,
                topP: top_p,
                topK: top_k,
            });


            console.log('Response metadata:');
            console.dir(responseResult, { depth: null, colors: true });

            const resultText = typeof responseResult === 'string' ? responseResult : (responseResult as any).response;

            if (resultText === undefined || resultText === null) {
                throw new Error("Local model returned undefined/null response.");
            }

            return resultText;

        } catch (e: any) {
            console.log('error while generating response: ', e)
            throw new Error(
                `
                generation_status: ${false}
                Error_msg: ${e}
                `
            )
        }

        finally {

            if (typeof (session as any).dispose === 'function') {
                (session as any).dispose();
            }

            if (seq && typeof (seq as any).dispose === 'function') {
                (seq as any).dispose();
            }

        }
    }

}