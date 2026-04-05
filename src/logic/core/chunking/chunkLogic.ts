import type { encode_types, chunk_payloads } from "./chunk.interface";
import { _raw } from "../../general.interface";
import { Prompts } from "../../system_prompt";

export class ChunkLogic {

    private static tiktoken_encoding: encode_types;

    constructor(payloads: encode_types) {

        payloads ? ChunkLogic.tiktoken_encoding = payloads : ChunkLogic.tiktoken_encoding = 'o200k_base';

    }

    public static async getChunk(payloads: _raw) {

        const params: chunk_payloads = {
            output_ratio: 0.3,
            limit: 4000,
            used: 0,
            fired: 0,
            buffer_factor: 0.6,
            file: {
                content: [],
                tokens: 0,
            }
        }

        await calcTokens({
            kind: 'spec',
            encoding: 'o200k_base',
            prompt: '',
            content: payloads.content,
            id: payloads.id,
        }).then((res: any) => {
            params.used = res.content;
            params.fired = res.prompt;
            params.file.tokens = res.total;
            params.file.content = payloads.content;
        })

        // calc best chunk size
        const ctx = (params.limit - (params.used + params.fired)) * params.buffer_factor * (1 / (1 + params.output_ratio));

        // determine the optimal chunk count
        const chunk_count = Math.ceil((params.file.tokens - (params.used + params.fired)) / ctx);

        const chunk_size = params.file.tokens / chunk_count;

        const chunks_res = await calcTokens({
            kind: 'array',
            encoding: ChunkLogic.tiktoken_encoding || 'cl100k_base',
            chunk: {
                size: chunk_size,
                count: chunk_count,
            },
            ctt: params.file.content,
        });

        return chunks_res;
    }

}

import { get_encoding } from 'tiktoken';
import { Utils } from "../../utils";

interface SingleCalc {
    kind: 'single';
    encoding: encode_types;
    ctt: string;
}

interface ArrayCalc {
    kind: 'array';
    encoding: encode_types;
    chunk: {
        size: number;
        count: number;
    }
    ctt: string[];
}

interface get_spec extends _raw {
    prompt?: string;
    kind: 'spec';
    encoding: encode_types;
}

type CalcTokens = SingleCalc | ArrayCalc | get_spec;

export const calcTokens = async (payloads: CalcTokens) => {

    const token_tolerance = 1.2

    const kind = payloads.kind;

    // industor standard is cl100k_base.
    // some model use o200k_base for reducing token size.

    const enc = get_encoding(payloads.encoding);

    switch (kind) {

        case 'single':

            return Math.ceil(enc.encode(payloads.ctt).length * token_tolerance);

        case 'spec':

        return (() => {

            const prompt = payloads.prompt ? Math.ceil(enc.encode(payloads.prompt).length * token_tolerance) : 0;

            const content = payloads.content.reduce((a: number, b: string) => {
                return a += Math.ceil(enc.encode(b).length * token_tolerance);
            }, 0);

            return {
                prompt: prompt,
                content: content,
                total: (prompt + content),
            }
        })()

        case 'array':

            return (() => {

                const form_format = {
                    est_token: 0,
                    range: {
                        start: 0,
                        end: 0,
                    },
                    chunk_id: '',
                    chunkIndex: 0,
                    content: [] as string[],
                }

                let form: typeof form_format | null = null;

                const return_chunks = [] as typeof form_format[];

                for (const index in payloads.ctt) {

                    const i = payloads.ctt[index];

                    // he will return unit32Array so we need to use length to get token count.
                    const token = Math.ceil(enc.encode(i).length * token_tolerance);

                    if (!form || form.est_token > payloads.chunk.size) {

                        if (form && form.est_token > payloads.chunk.size) {
                            return_chunks.push(form);
                        }

                        form = structuredClone(form_format);
                        form.range.start = Number(index);
                        form.chunkIndex = return_chunks.length;
                        form.chunk_id = `dist_${payloads.chunk.count}_${Utils.generateId()}`;
                    }

                    if (form.est_token <= payloads.chunk.size) {
                        form.est_token += token;
                        form.range.end = Number(index);
                        form.content.push(i);
                    }
                }

                if (form && form.content.length > 0) return_chunks.push(form);

                return return_chunks;

            })()
        default:
            console.error('something went wrong with calcTokens');
    }
}