import { Llama, getLlama, LlamaContext, LlamaModel, LlamaChat } from "node-llama-cpp";
import { extracted_data } from "../session/session.interface";
import { session_execute_p } from "../session/session.interface";
import { Prompts } from "../../system_prompt";
import { schema_builder } from "../../utils";

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

    public initialize = async (config: agent_config) => {

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

    private static session_queue: Promise<extracted_data>[] = [];

    public static launchSessions = async (max_conc: number, payloads: session_execute_p[]) => {


        for (const i of payloads) {

            if (Local_ClientManager.session_queue.length > max_conc - 1) {

                // wait for the first session to finish
                await Promise.race(Local_ClientManager.session_queue);
            }

            const build_llama_schema = await (async (full_schema = schema_builder(i.schema).schema): Promise<any> => {

                const agent = Local_ClientManager.agent;

                const clean_properties: Record<string, any> = {};

                for (const [key, value] of Object.entries(full_schema.properties)) {
                    const { description, requirement, exp, ...constraints } = value as any;
                    clean_properties[key] = constraints;
                }

                const grammar = await agent.createGrammarForJsonSchema({
                    type: full_schema.type,
                    properties: clean_properties,
                    required: full_schema.required,
                    additionalProperties: false
                });

                return grammar;
            })();


            const schema = build_llama_schema

            const seq = Local_ClientManager.context.getSequence();

            const session = await new LlamaChat({
                contextSequence: seq,
            })

            session.generateResponse([
                {
                    type: 'system',
                    text: Prompts.data_extraction(i.schema)
                },
                {
                    type: 'user',
                    text: `provided_data: ${i.payloads.content}`
                }
            ], {
                grammar: schema
            })

        }

    }

}