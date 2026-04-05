import * as openai from 'openai';
import { session_p, session_execute_p, extracted_data } from './session.interface';
import { Prompts } from '../../system_prompt';
import { getPaths } from '../../get_path';
import { Cloud_ClientManager } from '../load_agent/cloud';

import { schema_builder } from '../../utils';

let client: Cloud_ClientManager | null = null

// dispose every independent sessions status
export class Session {

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

import { writeIntoFile } from '../../utils';
import fs from "fs/promises"

export class SessionManager {

    // initial is 5
    private static max_conc: number = 5;

    constructor(payloads: session_p) {
        SessionManager.max_conc = payloads.max_conc ? payloads.max_conc : 5;
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

        if (client) {
            return;
        }

        const configPath = getPaths().file_agent_config;

        const res = await fs.readFile(configPath, 'utf-8').then(JSON.parse);

        if (!res.baseURL) {
            console.error('URL is missing. please check agent.config.json or settings');
        }

        if (!res.model) {
            console.error('Model is missing. please check agent.config.json or settings');
        }

        client = new Cloud_ClientManager({
            baseURL: res.baseURL,
            model: res.model,
            apiKey: res.apiKey ? res.apiKey : undefined,
            payloads: {
                timeout: res.timeout,
                maxRetries: res.maxRetries
            }
        })

    }

    public async launchSessions(payloads: session_execute_p[]) {

        for (const i of payloads) {

            if (SessionManager.session_queue.length > SessionManager.max_conc - 1) {

                // wait for the first session to finish
                await Promise.race(SessionManager.session_queue);
            }

            const session = new Session(client!.getClient(), client!.model);

            const promise = session.execute(i);

            SessionManager.session_queue.push(promise);

            promise.then( async (res) => {

                const result = await writeIntoFile('dataset', getPaths().file_dataset, {
                    dataset: {
                        path: getPaths().file_dataset,
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

            }).catch((err) => {
                
                SessionManager.session_list.failed.push(err.info);

            });

            // delete from queue when finished
            promise.finally(() => {
                const index = SessionManager.session_queue.indexOf(promise);
                if (index !== -1) SessionManager.session_queue.splice(index, 1);
            });

        }

        await Promise.all(SessionManager.session_queue);

        const result = await writeIntoFile('status', getPaths().file_status, {
            status: {
                path: getPaths().file_status,
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