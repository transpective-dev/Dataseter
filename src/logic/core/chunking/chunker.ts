import type { encode_types, chunk_payloads } from "../../interface/chunk.interface.ts";
import { type _raw } from "../../interface/general.interface.ts";
import { Prompts } from "../../utils/system_prompt.ts";
import { configManager } from "../../../config-util.ts";

export class ChunkLogic {

    private static tiktoken_encoding: encode_types;

    constructor(payloads: encode_types) {

        payloads ? ChunkLogic.tiktoken_encoding = payloads : ChunkLogic.tiktoken_encoding = 'o200k_base';

    }

    public static async getChunk(payloads: _raw) {

        try {

            const current = configManager.getActiveHostKey();

            const config = configManager.get(current);

            const params: chunk_payloads = {
                output_ratio: config.sessionSettings?.chunk_output_ratio || 0.3,
                input: config.context.input || 4000,
                output: config.context.output || 4000,
                used: 0,
                fired: 0,
                buffer_factor: config.sessionSettings?.chunk_buffer || 0.6,
                file: {
                    content: [],
                    tokens: 0,
                }
            }

            params.file.content = payloads.content !== null ? typeof payloads.content === 'string' ? payloads.content.split('\n') : payloads.content : [];

            const res: any = await calcTokens('spec', {
                prompt: '',
                content: params.file.content,
                file_id: payloads.id,
            }, 'o200k_base');

            params.used = res.content;
            params.fired = res.prompt;
            params.file.tokens = res.total;

            // best input ctx size for chunk
            const ctx = (params.input - (params.used + params.fired)) * params.buffer_factor;

            if (ctx <= 0) {
                throw new Error("Context size is too small to chunk");
            }

            // determine the optimal chunk count
            const chunk_count = Math.ceil(params.file.tokens / ctx);

            const overlap = ('sessionSettings' in config && config.sessionSettings?.chunk_overlap_lines !== undefined)
                ? config.sessionSettings.chunk_overlap_lines
                : 50;

            const chunks_res = await calcTokens('chunker', {
                tpc: ctx,
                ctt: params.file.content as string[],
                file_id: payloads.id,
                overlap: overlap,
            }, ChunkLogic.tiktoken_encoding || 'cl100k_base');

            return chunks_res;

        } catch (e: any) {
            console.error(e);
            return {
                error: e.message,
            };
        }

    }

}

import { get_encoding } from 'tiktoken';
import { Utils } from "../../utils/utils.ts";

interface chunk_detail {
    // token per chunk
    tpc: number;
    ctt: string[];
    file_id: string;
    overlap?: number;
}

interface spec_detail {
    prompt: string;
    content: string[] | string | null;
    file_id: string;
}

export const calcTokens = async (type: 'single' | 'chunker' | 'spec', payloads: string | chunk_detail | spec_detail, encoding: encode_types) => {

    const token_tolerance = 1.2

    // industor standard is cl100k_base.
    // some model use o200k_base for reducing token size.

    const enc = get_encoding(encoding);

    switch (type) {

        case 'single':

            if (typeof payloads === 'string') {
                return Math.ceil(enc.encode(payloads).length * token_tolerance);
            }
            break;

        case 'spec':
            if (typeof payloads !== 'string' && 'prompt' in payloads) {
                const promptStr = payloads.prompt || '';
                const cttStr = Array.isArray(payloads.content) ? payloads.content.join('\n') : (payloads.content || '');

                const pToken = Math.ceil(enc.encode(promptStr).length * token_tolerance);
                const cToken = Math.ceil(enc.encode(cttStr).length * token_tolerance);

                return {
                    content: cToken,
                    prompt: pToken,
                    total: pToken + cToken
                };
            }
            break;

        case 'chunker':

            if (typeof payloads !== 'string' && 'tpc' in payloads) {

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
                    const tpc = payloads.tpc;
                    const file_id = payloads.file_id || 'unknown';
                    const overlapLines = payloads.overlap || 0;

                    let index = 0;

                    while (index < payloads.ctt.length) {

                        const i = payloads.ctt[index];

                        if (i === undefined) {
                            index++;
                            continue;
                        }

                        // token count
                        const token = Math.ceil(enc.encode(i).length * token_tolerance);

                        if (!form) {
                            form = structuredClone(form_format);
                            form.range.start = index;
                            form.chunkIndex = return_chunks.length;
                            form.chunk_id = `dist_${file_id}_${Utils.generateId()}`;
                        }

                        // If adding this line exceeds TPC and the chunk isn't empty, commit the chunk
                        if (form.est_token + token > tpc && form.content.length > 0) {

                            return_chunks.push(form);

                            // Calculate where the next chunk should start based on overlap
                            let nextStart = Math.max(0, index - overlapLines);

                            // Prevent infinite loops by ensuring forward progress relative to the previous chunk's exact start line
                            const prevStart = return_chunks[return_chunks.length - 1]?.range?.start || 0;

                            if (nextStart <= prevStart) {
                                nextStart = prevStart + 1;
                            }

                            form = null;
                            index = nextStart;
                            continue;
                        }

                        form.est_token += token;
                        form.range.end = index;
                        form.content.push(i);
                        index++;
                    }

                    if (form && form.content.length > 0) return_chunks.push(form);

                    return return_chunks;

                })()
            }
            break;
        default:
            console.error('something went wrong with calcTokens');
    }
}