import { Llama, getLlama, LlamaContext, LlamaModel, LlamaChat } from "node-llama-cpp";
import type { chunk_cont, extracted_data, session_execute_p } from "../../interface/session.interface.ts";
import { Prompts } from "../../utils/system_prompt.ts";
import { schema_builder } from "../../utils/utils.ts";

interface agent_config {
    path: string,
    name: string,
    contextSize: number,
    cache: "F16" | "F32" | "Q8_0" | "Q4_0",
}

// llamamodel: for load model
// llamacontext: create space for context
// llamachatsession: manage session

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

    private static setContext = async (ctx: number) => {
        Local_ClientManager.context = await Local_ClientManager.model.createContext({
            contextSize: ctx,
            experimentalKvCacheKeyType: Local_ClientManager.config.cache
        })
    }

    public static isInitialized(): boolean {
        return !!Local_ClientManager.agent && !!Local_ClientManager.model && !!Local_ClientManager.context;
    }

    public initialize = async (config: agent_config) => {

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

        // create init ctx pool
        await Local_ClientManager.setContext(config.contextSize);

        console.log(Local_ClientManager.context.contextSize);

    }

    // set context pool for concurrency
    public static setContextPool = async (ctx: number) => {
        Local_ClientManager.setContext(ctx)
    }

    public static executeSingle = async (payload: chunk_cont): Promise<string> => {

        const full_schema = await schema_builder()
        const prompt = await Prompts.data_extraction()
        console.dir(full_schema, { depth: null, colors: true })

        const schemaData = (full_schema as any).schema;
        const agent = Local_ClientManager.agent;
        const clean_properties: Record<string, any> = {};

        for (const [key, value] of Object.entries(schemaData.properties)) {
            const { description, requirement, exp, ...constraints } = value as any;
            clean_properties[key] = constraints;
        }

        const grammar = await agent.createGrammarForJsonSchema({
            type: 'array',
            items: {
                type: 'object',
                properties: clean_properties,
                required: schemaData.required,
                additionalProperties: false
            }
        });

        const schema = grammar;
        const seq = Local_ClientManager.context.getSequence();

        const session = new LlamaChat({
            contextSequence: seq,
        })
        
        console.log(payload.content)
        
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
                grammar: schema
            });


            console.log('Response metadata:', responseResult);

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