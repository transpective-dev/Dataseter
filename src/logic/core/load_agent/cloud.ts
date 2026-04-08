import * as openai from 'openai';
import type { ClientConfig, connection_status } from '../../interface/general.interface.ts';

export class Cloud_ClientManager {

    private client: openai.OpenAI;

    public model: string;

    constructor(config: ClientConfig) {

        this.model = config.model;

        this.client = new openai.OpenAI({
            baseURL: config.baseURL,
            apiKey: config.apiKey || 'local-key',
            timeout: config.payloads.timeout,
            maxRetries: config.payloads.maxRetries
        });

    }

    public getClient(): openai.OpenAI {
        return this.client;
    }

    public async testConnection(model: string): Promise<connection_status> {
        try {
            // race between list and timeout
            const ls = await Promise.race([
                this.client.models.list(),
                new Promise<never>((_, reject) => {
                    setTimeout(() => {
                        reject(new Error('Request Timeout'));
                    }, this.client.timeout);
                })
            ]);

            if (ls?.data?.find((i) => i.id === model)) {
                return {
                    status: 'model_exist',
                    msg: 'Model is exist',
                    color: '#30D158'
                }
            }
            
            return {
                status: 'model_not_exist',
                msg: 'Model is not exist',
                color: '#FFD60A'
            };

        } catch(e: any) {
            return {
                status: 'connection_error',
                msg: e.message,
                color: '#FF453A'
            };
        }
    }
}