chat.completions.create: {

    params: {
        model: string,              // model name
        messages: Message[],        // messages
        temperature?: number,       // temperature
        max_tokens?: number,        // max tokens
        top_p?: number,             // top p
        frequency_penalty?: number, // frequency penalty
        presence_penalty?: number,  // presence penalty
        stream?: boolean,           // stream
        response_format?: object,   // response format
        tools?: Tool[],             // tools
        user?: string,              // user
    }

    user: {
        system: system_prompt,
        user: user_prompt,
    }

    // specify output format
    response_format: { type: 'json_object' }
    response_format: { type: 'json_schema', schema: { ... } }

    // get response
    content = response.choices[0].message.content;

    // get used token
    tokens = response.usage.total_tokens;

}
