import * as openai from 'openai';
import type { session_p, session_execute_p, extracted_data } from '../../interface/session.interface.ts';
import { Prompts } from '../../utils/system_prompt.ts';
import { paths } from '../../utils/get_path.ts';
import { Cloud_ClientManager } from '../load_agent/cloud.ts';
import { Local_ClientManager } from '../load_agent/local.ts';
import { configManager } from '../../../config-util.ts';

import { schema_builder } from '../../utils/utils.ts';

let client: Cloud_ClientManager | null = null

export interface ISession {
    execute(payloads: session_execute_p): Promise<extracted_data>;
}

// Cloud Session Implementation
export class CloudSession implements ISession {

    private client: openai.OpenAI;

    private model: string;

    constructor(client: openai.OpenAI, model: string) {
        this.client = client;
        this.model = model;
    }

    // execute session
    public async execute(payloads: session_execute_p): Promise<extracted_data> {

        const system_prompt = Prompts.data_extraction(payloads.schema);
        const getSchema = schema_builder(payloads.schema);

        try {
            const response = await this.client.chat.completions.create({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: system_prompt
                    },
                    {
                        role: 'user',
                        content: `provided_data: ${payloads.payloads.content}`
                    }
                ],
                temperature: 0.5,
                response_format: {
                    type: "json_schema",
                    json_schema: getSchema
                }
            });

            const content = response.choices[0]?.message?.content;

            if (!content) {
                throw new Error('Empty response from model');
            }

            const extractedData = JSON.parse(content);

            return {
                info: {
                    id: payloads.payloads.chunk_id,
                    status: 'completed',
                    tokens: response.usage?.total_tokens || 0,
                    finishReason: response.choices[0]?.finish_reason || 'unknown'
                },
                data: extractedData,
            };

        } catch (error: any) {
            return {
                info: {
                    id: payloads.payloads.chunk_id,
                    status: 'failed',
                    error_msg: error.message,
                    tokens: 'failed to count used tokens',
                    finishReason: 'error'
                },
                data: null,
            };
        }
    }

}

// Local Session Implementation
export class LocalSession implements ISession {
    public async execute(payloads: session_execute_p): Promise<extracted_data> {
        try {
            const responseTxt = await Local_ClientManager.executeSingle(payloads);
            
            if (!responseTxt) {
                throw new Error("Local model returned empty response.");
            }

            const extractedData = JSON.parse(responseTxt);

            return {
                info: {
                    id: payloads.payloads.chunk_id,
                    status: 'completed',
                    tokens: 0,
                    finishReason: 'stop'
                },
                data: extractedData
            };
        } catch (error: any) {
            return {
                info: {
                    id: payloads.payloads.chunk_id,
                    status: 'failed',
                    error_msg: error.message,
                    tokens: 0,
                    finishReason: 'error'
                },
                data: null
            };
        }
    }
}

import { writeIntoFile } from '../../utils/utils.ts';
import fs from "fs/promises"

export class SessionManager {

    // initial is 5
    private static max_conc: number = 5;

    private static config = configManager.getActiveConfig();

    constructor() {
        SessionManager.max_conc = SessionManager.config.sessionSettings.max_concurrent ? SessionManager.config.sessionSettings.max_concurrent : 5;
    }

    private static session_queue: Promise<extracted_data>[] = [];

    private static session_list: {
        success: extracted_data['info'][];
        failed: extracted_data['info'][];
    } = {
            success: [],
            failed: [],
        }

    public static async instantiateClient() {

        const host = configManager.getActiveHostKey();

        if (host === 'server_config') {
            if (client) {
                return;
            }

            if (!('base_url' in this.config) || ((this.config as any).base_url === '')) return 'base_url is missing. please check agent.config.json or settings';

            client = new Cloud_ClientManager({
                baseURL: (this.config as any).base_url,
                model: this.config.model_name,
                apiKey: (this.config as any).api_key || '',
                payloads: {
                    timeout: 30000,
                    maxRetries: 3
                }
            })

            return;
        } else if (host === 'local_config') {
            if (Local_ClientManager.isInitialized()) {
                return;
            }

            // instantiate local model
            console.log('[Adapter] Initializing Local Client Manager...');
            const localConfig = {
                path: (this.config as any).model_path || '',
                name: this.config.model_name || 'local-model',
                contextSize: this.config.context?.input || 4000,
                cache: (this.config as any).sessionSettings?.cache || 'F16'
            };
            
            const localClient = new Local_ClientManager(localConfig);
            await localClient.initialize(localConfig);
            
            return;
        }

    }

    // entry
    public static async launchSessions(payloads: session_execute_p[]) {

        const host = configManager.getActiveHostKey();

        for (const i of payloads) {

            if (SessionManager.session_queue.length > SessionManager.max_conc - 1) {

                // wait for the first session to finish
                await Promise.race(SessionManager.session_queue);
            }

            let promise: Promise<extracted_data>;
            let session: ISession;

            if (host === 'server_config') {
                await this.instantiateClient();
                session = new CloudSession(client!.getClient(), client!.model);
                promise = session.execute(i);
            } else {
                await this.instantiateClient();
                session = new LocalSession();
                promise = session.execute(i);
            }

            SessionManager.session_queue.push(promise);

            promise.then(async (res: extracted_data) => {

                const result = await writeIntoFile('dataset', paths.file_dataset, {
                    dataset: {
                        path: paths.file_dataset,
                        content: res.data
                    }
                });

                if (!result?.status) {

                    SessionManager.session_list.failed.push({
                        id: res.info.id,
                        status: 'extraction suceed but append failed',
                        error_msg: result?.msg as string,
                        tokens: res.info.tokens,
                        finishReason: res.info.finishReason
                    });

                    return;
                }

                SessionManager.session_list.success.push(res.info);

            }).catch((err: any) => {

                SessionManager.session_list.failed.push(err.info);

            });

            // delete from queue when finished
            promise.finally(() => {
                const index = SessionManager.session_queue.indexOf(promise);
                if (index !== -1) SessionManager.session_queue.splice(index, 1);
            });

        }

        await Promise.all(SessionManager.session_queue);

        const result = await writeIntoFile('status', paths.file_status, {
            status: {
                path: paths.file_status,
                content: SessionManager.session_list
            }
        });

        if (!result?.status) {
            console.error('Failed to write status file');
        } else {
            console.log('Status file written successfully');
        }

        return SessionManager.session_list;

    }
}