export type encode_types = 'o200k_base' | 'cl100k_base';

export interface chunk_payloads {
    output_ratio: number;
    limit: number;
    used: number;
    fired: number;
    buffer_factor: number;
    file: {
        content: string[];
        tokens: number;
    };
}

