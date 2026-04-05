import * as z from 'zod'

const sessionSettings = z.object({
    
    // buffer for mitigating overflow
    chunk_buffer: z.number().min(0).max(1).default(0.6),
    
    // reserve context space for output
    chunk_output_ratio: z.number().min(0).max(1).default(0.5),

    // Enable overlaps to minimize flow breaks.
    chunk_overlap_lines: z.number().min(0).max(50).default(50),

    // select token encodings
    token_encoding: z.enum(['o200k_base', 'cl100k_base']).default('o200k_base'),

    // set max concurrent requests
    max_concurrent: z.number().min(1).max(5).default(5),
})

const commonModelConfig = z.object({
    model_name: z.string().default('undefined'),
    context: z.object({
        input: z.number().default(8192),
        output: z.number().default(8192),
    }).default({}),
    model_preference: z.object({  
        temperature: z.number().min(0).max(2).default(0.7),
        top_p: z.number().min(0).max(0.9).default(0.9),
        top_k: z.number().min(0).max(40).default(40),
        repeat_penalty: z.number().min(0).max(2).default(1.1),
    }).default({}),
})

const cache = z.enum(['F16', 'F32', 'Q8_0', 'Q4_0'])

const hostLocal = commonModelConfig.extend({
    host: z.literal('local'),
    model_path: z.string().default('undefined'),
    sessionSettings: sessionSettings.extend({
        cache: cache.default('F16')
    }).default({})
})


const hostServer = commonModelConfig.extend({
  host: z.literal('server'),
  api_key: z.string().default('undefined'),
  base_url: z.string().default(''),
  sessionSettings: sessionSettings.default({})
})

export const config_schema = z.object({
    model_config: z.discriminatedUnion('host', [hostServer, hostLocal]).default({
        host: 'server'
    }),
    user_settings: z.object({
        extracted_output_dir: z.string().min(1).default('./output'),
        preference: z.object({
            output_language: z.string().default('en')  
        }).default({})
    }).default({})
})

export type ConfigSchema = z.infer<typeof config_schema>