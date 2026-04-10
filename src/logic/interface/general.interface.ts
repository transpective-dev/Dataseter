import { _array } from "zod/v4/core";

export type register_agent = local | cloud

interface local {
    kind: 'local',
    payloads: config_local
}

interface cloud {
    kind: 'cloud',
    payloads: config_cloud
}

export interface _raw {
    id: string,
    content: string[] | null | string
    status: boolean
}

export interface chunked_raw extends _raw {
    token: number
}

export interface config_interface {
    default_model: string | undefined;
    output: {
        output_dir: string | undefined,
    }
}

export type agent_ls = {
    [key: string]: config_cloud | config_local
}

export type c_or_l = config_cloud | config_local;


export type config_cloud = {
    host: 'cloud';
    model_name: string;
    base_url: string;
    api_key: string;
    session_settings: {
        chunk_config: chunk_config;
        token_encoding: 'o200k_base' | 'cl100k_base';
        max_concurrent: number;
    }
    tokens: {
        input: tokens | number;
        output: tokens | number;
    }
    connect: connect;
    usage: usage;
};

export const cache_type = ["F16", "F32", "Q8_0", "Q4_0"] as const;

export const token_encoding = ["o200k_base", "cl100k_base"] as const;

export type config_local = {
    host: 'local';
    model_name: string;
    file_path: string;
    session_settings: {
        chunk_config: chunk_config;
        token_encoding: typeof token_encoding[number];
        cache: typeof cache_type[number];
        max_concurrent: number;
    }
    tokens: {
        input: tokens | number;
        output: tokens | number;
    }
    connect: connect;
    usage: usage;  
};

interface connect {
    timeout: number;
    max_retries: number;
}

interface usage {
    usedToken: number;
    calledTime: number;
    connection: connection_status | undefined;
}

export type connection_status = {
    status: 'model_exist'
    msg: string
    color: '#30D158'
} | {
    status: 'model_not_exist'
    msg: string
    color: '#FFD60A'
} | {
    status: 'connection_error'
    msg: string
    color: '#FF453A'
}

interface chunk_config {
    chunk_buffer_factor: number;
    chunk_output_ratio: number;
    chunk_overlap_lines: number;
}

export const tokensMap = [
    1000000,
    200000,
    128000,
    64000,
    32000,
    16000,
    8000,
    4000,
] as const;

export interface ClientConfig {
    baseURL: string;
    apiKey?: string;
    model: string;
    payloads: {
        timeout: number;
        maxRetries: number;
    }
}

type tokens = typeof tokensMap[number];

export type nort_status = 'success' | 'error' | 'warning' | 'info' ;

export interface nort_msg {
    status: nort_status;
    label?: string;
    code?: string;
    msg: string ;
    function?: {
        label: string;
        func: () => void;
    };
}

export interface processed_history_form {
    agent: string;
    datetime: string;
    usedToken: string;
    file: {
         name: string;
         path: string;
    };
    extracted: string;
    dataset_id: string;
}

export interface msg_log_form {
    datetime: string;
    status: nort_status;
    label?: string;
    code?: string;
    msg: string;
    function?: string;
}

export const config_form_filled: {
    cloud: config_cloud,
    local: config_local
} = {
    cloud: {
        host: 'cloud' as const,
        model_name: '',
        base_url: '',
        api_key: '',
        session_settings: {
            chunk_config: {
                chunk_buffer_factor: 0.3,
                chunk_output_ratio: 0.5,
                chunk_overlap_lines: 5
            },
            token_encoding: 'o200k_base',
            max_concurrent: 5
        },
        connect: {
            timeout: 30000,
            max_retries: 3
        },
        tokens: {
            input: 0,
            output: 0
        },
        usage: {
            usedToken: 0,
            calledTime: 0,
            connection: undefined
        }
    },
    local: {
        host: 'local' as const,
        model_name: '',
        file_path: '',
        session_settings: {
            chunk_config: {
                chunk_buffer_factor: 0.3,
                chunk_output_ratio: 0.5,
                chunk_overlap_lines: 5
            },
            token_encoding: 'o200k_base',
            cache: "F16",
            max_concurrent: 5
        },
        tokens: {
            input: 0,
            output: 0
        },
        connect: {
            timeout: 30000,
            max_retries: 3
        },
        usage: {
            usedToken: 0,
            calledTime: 0,
            connection: undefined
        }
    }
}

import type { extracted_data } from "./session.interface.ts";

export interface session_queue {
    id: string;
    time: string;
    output: string;
    promise: Promise<extracted_data>;
}

export interface emit_token {
    id: string;
    token: string;
} 