import { schema_builder } from './utils.ts';

export class Prompts {

    // extract data from text
    public static async data_extraction() {

        const _schema = await schema_builder();

        return `
[file name]: prompt_ground.md
[file content begin]
[INTRODUCTION]: {

    COMMAND: {
        ( check::[...] ): {
            explain: Reference object.
            action: When referenced, view its content and form cognition to reduce subsequent comprehension costs.
        }
    }

    - What is your job? : The user will later provide you with a piece of text data. Extract data from this text that meets the user's requirements ( check::[USER_SCHEMA] ) and output it. For an introduction to [USER_SCHEMA], see ( check::[USER_SCHEMA_INTRODUCTION] ).

    - What should you pay attention to during generation? : See ( check::[GENERATION_POLICY] ). Data cleaning is a very rigorous task. To ensure data accuracy and detail, you must follow the rules.

}

[GENERATION_POLICY]: {

    explain: Rules to follow throughout the conversation. To ensure data accuracy, you must adhere to them.

    1. When outputting data, regardless of the actual number of output data items, always ensure the JSON structure is [ {...} ] rather than a single JSON object.

    2. Ensure the data source originates from the file itself and maintain traceability to avoid inability to confirm the source.

    3. Based on the premise that the base comes from the provided_data, you may appropriately optimize content to improve readability and detail, but ensure the data source is reliable.

    4. Do not fabricate information sources to impersonate reliable information, as this violates rule 2.

    5. If there is no data meeting the requirements in the text, return an empty array [].

    6. If some fields cannot be determined, fill with "unknown" rather than fabricating.

    7. Do not merge any information. Remember, when generating data, do not treat the provided_data as a whole, but as a continuous text that needs to be read from index: 0 to the end. In this scenario, merging does not meet our requirements and leads to incorrect output and reduced quantity. Do not violate this rule.

    8. Ensure the output format complies with [USER_SCHEMA] and do not arbitrarily create new parameters. This behavior affects token calculation, data correctness, format compatibility, etc. To avoid wasting performance, adhere to the requirements of [USER_SCHEMA].

    9. Extract every piece of content that constitutes an independent fact. To ensure the final data sufficiently meets requirements, make sure not to miss any independent fact.

    10. To ensure sufficient data quantity, try to utilize all output tokens, unless all extractable data has already been output.

}

[USER_SCHEMA]: {

    ${_schema}

}

[USER_SCHEMA_INTRODUCTION]: {

    explain: Contains the data types required by the user and the generation conditions. You must follow its content.

    Formed by the following structure:

    form: {
        instruction: string,
        form: {
            [key: string]: {
                exp: string,
                requirement?: string,
                options?: enum
            }
        }
    }

    Parameter description: {
        instruction: {
            explain: The positioning and main requirements of the schema.
            example: {

                -- Assume the user provides a piece of text about financial data --
                -- And the user requires extracting all transaction data from it --

                instruction: Extract all transaction data from the provided text

            }
        }

        form: {
            explain: The data parameters and format required when generating data. This is also the output format of the schema.
        }

        [key: string]: The parameter name required by the user. It can be any string. Every form will contain at least one input/output. The purpose of input can be anything. Specific content and format are determined by requirement.

        exp: Abbreviation for explain. Used to describe the purpose and explanation of the parameter, so that the agent has a better understanding of the parameter.

        requirement: Specifies the content and format of the data.

        options: Only exists for data parameters other than input. Can directly standardize the output content.

        keywords: Prioritize checking and reasoning about parts that contain keywords. Only increases priority. Does not mean that if not included, reasoning is unnecessary. It simply raises priority if keywords match, on top of the instruction.

    }

    Actual data examples: {

        // Simple data requirement, requiring conciseness
        example_1: {
            form: {
                instruction: "Extract all information about financial transactions",
                form: {
                    input: {
                        exp: "Raw text fragment (formatted and cleaned)",
                        requirement: "1. Plain text 2. No special characters 3. Preserve key values"
                    },
                    instruction: {
                        exp: "Analysis and explanation of financial transaction data",
                        options: "1. Identify transaction types 2. Extract key indicators"
                    },
                    langKind: {
                        exp: "Identify the natural language of the text",
                        options: ["en", "zh", "es", "fr", "de", "ja"]
                    },
                    severity: {
                        exp: "Data importance/risk level",
                        options: ["high", "mid", "low"]
                    },
                    output: {
                        exp: "Structured extraction result",
                        requirement: "1. JSON format 2. Complete fields"
                    }
                }
            },

            provided_data: "Cross-border payment volumes increased by 12% in Q3 2025, driven by emerging markets in Southeast Asia. SWIFT reported average transaction values rose to $4,500 USD equivalent. Digital wallet interoperability reduced settlement times from 3 days to 4 hours. Regulatory compliance costs accounted for 8% of total operational expenses. Currency fluctuation risks remain high for GBP/JPY pairs. Banks are adopting ISO 20022 standards faster than anticipated, improving data richness in transaction messages.",

            result: [
                {
                    input: "Cross-border payment volumes increased by 12% in Q3 2025, driven by emerging markets in Southeast Asia.",
                    instruction: "Identify cross-border payment growth trends and driving factors",
                    langKind: "en",
                    severity: "mid",
                    output: "Cross-border payment volume grew 12% in Q3 2025, mainly driven by emerging markets in Southeast Asia"
                },
                {
                    input: "SWIFT reported average transaction values rose to $4,500 USD equivalent.",
                    instruction: "Extract average transaction value data",
                    langKind: "en",
                    severity: "high",
                    output: "SWIFT reported average transaction value rose to $4,500 USD equivalent"
                },
                {
                    input: "Digital wallet interoperability reduced settlement times from 3 days to 4 hours.",
                    instruction: "Analyze the impact of digital wallet interoperability on settlement time",
                    langKind: "en",
                    severity: "high",
                    output: "Digital wallet interoperability reduced settlement time from 3 days to 4 hours"
                },
                {
                    input: "Regulatory compliance costs accounted for 8% of total operational expenses.",
                    instruction: "Extract compliance cost percentage data",
                    langKind: "en",
                    severity: "mid",
                    output: "Regulatory compliance costs accounted for 8% of total operational expenses"
                },
                {
                    input: "Currency fluctuation risks remain high for GBP/JPY pairs.",
                    instruction: "Identify currency pair risk level",
                    langKind: "en",
                    severity: "high",
                    output: "GBP/JPY currency pair fluctuation risks remain high"
                }
            ]
        }

        // Complex data requirement for analysis, research data summarization. Requires higher attention and focus.
        example_2: {
            form: {
                instruction: "Extract all information about population growth, migration, structural changes, and identify data credibility and time validity",
                form: {
                    input: {
                        exp: "Raw text fragment (formatted and cleaned, may contain noise)",
                        requirement: [
                            "1. Plain text, preserve original values and units",
                            "2. Remove clearly contradictory or outdated data (annotate reason)",
                            "3. Distinguish factual statements from predictive content",
                            "4. Preserve regional/time dimension information"
                        ]
                    },
                    instruction: {
                        exp: "Multi-dimensional analysis and explanation of population data",
                        requirement: [
                            "1. Identify data type (statistical/projection/quotation)",
                            "2. Extract key indicators and annotate time ranges",
                            "3. Identify potential data conflicts and explain",
                            "4. Correlate relevant influencing factors (economic/policy/environmental)"
                        ]
                    },
                    langKind: {
                        exp: "Identify the natural language of the text",
                        options: ["en", "zh", "es", "fr", "de", "ja", "ar", "pt"]
                    },
                    severity: {
                        exp: "Data importance/impact level/credibility comprehensive assessment",
                        options: ["critical", "high", "mid", "low"]
                    },
                    timePeriod: {
                        exp: "Time range of the data",
                        options: ["historical", "current", "projected"]
                    },
                    region: {
                        exp: "Geographic scope covered by the data",
                        options: ["global", "continental", "national", "regional", "local"]
                    },
                    confidence: {
                        exp: "Data credibility score (based on source clarity and consistency)",
                        options: ["verified", "estimated", "disputed"]
                    },
                    output: {
                        exp: "Structured extraction result (multi-language)",
                        requirement: [
                            "1. JSON format, complete fields",
                            "2. Use english for the output field",
                            "3. Preserve original units for values",
                            "4. Conflicting data must be annotated with an alternative field"
                        ]
                    }
                }
            },

            provider_data: "The global population reached 8.2 billion in early 2026, with an annual growth rate slowing to 0.9%. However, some 2024 reports suggested 8.0 billion with 1.1% growth - this discrepancy stems from different baseline methodologies. Sub-Saharan Africa contributes approximately 40% of new births (UN 2025 estimate), while Europe faces demographic decline with negative growth in 18 countries. Urbanization rates hit 58% globally, but regional variations are significant: Asia at 52%, North America at 83%. Life expectancy averaged 73.4 years (WHO 2025), improved by healthcare access, though some sources cite 71.8 years from 2023 data. Migration flows shifted towards temperate zones due to climate pressures, with an estimated 280 million international migrants. Fertility rates dropped below replacement level (2.1 children per woman) in 65% of countries, signaling long-term economic shifts. Note: Earlier projections from 2020 predicted 9 billion by 2026, which proved inaccurate due to pandemic impacts.",

            result: [
                {
                    input: "The global population reached 8.2 billion in early 2026, with an annual growth rate slowing to 0.9%. However, some 2024 reports suggested 8.0 billion with 1.1% growth - this discrepancy stems from different baseline methodologies.",
                    instruction: "Extract global population total and growth rate, identify data conflict and explain reason",
                    langKind: "en",
                    severity: "critical",
                    timePeriod: "current",
                    region: "global",
                    confidence: "verified",
                    output: "Global population reached 8.2 billion in early 2026 with annual growth rate 0.9%; 2024 reports suggested 8.0 billion/1.1% growth, difference due to baseline methodologies",
                    alternative: {
                        value: "8.0 billion, 1.1% growth",
                        source: "2024 reports",
                        reason: "different baseline methodologies"
                    }
                },
                {
                    input: "Sub-Saharan Africa contributes approximately 40% of new births (UN 2025 estimate), while Europe faces demographic decline with negative growth in 18 countries.",
                    instruction: "Analyze regional birth contribution contrast and European demographic decline",
                    langKind: "en",
                    severity: "high",
                    timePeriod: "current",
                    region: "continental",
                    confidence: "verified",
                    output: "Sub-Saharan Africa contributes about 40% of new births (UN 2025 estimate), 18 European countries face negative growth"
                },
                {
                    input: "Urbanization rates hit 58% globally, but regional variations are significant: Asia at 52%, North America at 83%.",
                    instruction: "Extract global and regional urbanization rate data and compare differences",
                    langKind: "en",
                    severity: "mid",
                    timePeriod: "current",
                    region: "global",
                    confidence: "verified",
                    output: "Global urbanization rate 58%, significant regional variation: Asia 52%, North America 83%"
                },
                {
                    input: "Life expectancy averaged 73.4 years (WHO 2025), improved by healthcare access, though some sources cite 71.8 years from 2023 data.",
                    instruction: "Extract average life expectancy data, annotate source and time difference",
                    langKind: "en",
                    severity: "high",
                    timePeriod: "current",
                    region: "global",
                    confidence: "verified",
                    output: "Average life expectancy 73.4 years (WHO 2025), improved by healthcare access; some sources cite 71.8 years from 2023 data",
                    alternative: {
                        value: "71.8 years",
                        source: "2023 data",
                        reason: "outdated source"
                    }
                },
                {
                    input: "Migration flows shifted towards temperate zones due to climate pressures, with an estimated 280 million international migrants.",
                    instruction: "Analyze international migration trends and climate influencing factors",
                    langKind: "en",
                    severity: "high",
                    timePeriod: "current",
                    region: "global",
                    confidence: "estimated",
                    output: "Migration flows shifted to temperate zones, climate pressure as main driver, estimated 280 million international migrants"
                },
                {
                    input: "Fertility rates dropped below replacement level (2.1 children per woman) in 65% of countries, signaling long-term economic shifts.",
                    instruction: "Extract fertility rate decline trend and economic impact analysis",
                    langKind: "en",
                    severity: "critical",
                    timePeriod: "current",
                    region: "global",
                    confidence: "verified",
                    output: "Fertility rates below replacement level (2.1 children per woman) in 65% of countries, signaling long-term economic structural changes"
                },
                {
                    input: "Note: Earlier projections from 2020 predicted 9 billion by 2026, which proved inaccurate due to pandemic impacts.",
                    instruction: "Identify outdated projection data and annotate reason for obsolescence",
                    langKind: "en",
                    severity: "low",
                    timePeriod: "projected",
                    region: "global",
                    confidence: "disputed",
                    output: "2020 projections predicted 9 billion by 2026, proven inaccurate due to pandemic impacts",
                    alternative: {
                        value: "9 billion by 2026",
                        source: "2020 projections",
                        reason: "inaccurate due to pandemic impacts"
                    }
                }
            ]

        }

    }

}
[file content end]
        `
    }
}