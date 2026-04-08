export interface AgentConfig {
    modelName: string;
    baseUrl: string;
    apiKey: string;
    chunkBufferFactor: number;
    chunkOutputRatio: number;
    chunkOverlapLines: number;
    inputDir: string;
    outputDir: string;
    outputFormat: 'json' | 'jsonl';
    tokenEncoding: string;
    maxConcurrent: number;
    timeout: number;
    maxRetries: number;
}

export interface session_p {
    max_conc: number;
}

export interface session_execute_p extends chunk_cont {
    payloads: chunk_cont;
    schema: schema_base;
}

export interface extracted_data {
    info: {
        id: string;
        status: status_p;
        tokens: number | 'failed to count used tokens';
        finishReason: string;
        error_msg?: string
    },
    data: data
}

export interface session_list {
    success: extracted_data['info'][];
    failed: extracted_data['info'][];
}

export interface write_into_file {
    dataset?: {
        path: string;
        content: data;
    },
    status?: {
        path: string;
        content: session_list;
    }
}

export type data = {
    [key: string]: string,
}[] | null;

type status_p = 'pending' | 'processing' | 'completed' | 'failed' | 'extraction suceed but append failed';

export interface chunk_cont {
    est_token: number;
    range: {
        start: number;
        end: number;
    };
    chunk_id: string;
    chunkIndex: number;
    content: string;
}

// there must have a input in schema
export interface schema_base {
    instruction: string;
    form: {
        [key: string]: input | normal;
    }
}

interface input {
    requirement: string | string[];
    keywords?: string[];
    options?: string[];
}

interface normal {
    exp: string;
    options?: string[];
}

export type { normal }
export type { input }

