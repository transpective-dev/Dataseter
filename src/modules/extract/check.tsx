import SelectInput from "ink-select-input";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useState, useEffect } from "react";
import { palette } from "../../assets/colors.ts";
import { Parser } from "../../logic/core/parsers/baseParser.ts";
import { ChunkLogic } from "../../logic/core/chunking/chunker.ts";
import { CustomIndicator } from "../../assets/theme.tsx";
import { Prompts } from "../../logic/utils/system_prompt.ts";
import { calcTokens } from "../../logic/core/chunking/chunker.ts";
import type { chunk_cont } from "../../logic/interface/session.interface.ts";

export const Check = ({
  next,
  quit,
  path,
  set_payloads
}: {
  next: (chunks?: any) => void;
  quit: () => void;
  path: string;
  set_payloads: (payloads: chunk_cont[]) => void;
}) => {

  const [isParsed, setIsParsed] = useState<{
    status: boolean | null;
    data: {
      id: string;
      content: string[] | string;
    } | null;
    estimates: {
      token: number;
      chunk: number;
      chunksRaw?: any;
    } | null;
  } | {
      status: false,
      message: string,
    }>({
    status: null,
    data: null,
    estimates: null,
  });

  const [other, setOther] = useState<{
    prompt_token: number;
  }>({
    prompt_token: 0,
  });

  useEffect(() => {

    (async () => {
      const res = await calcTokens('single', await Prompts.data_extraction(), 'o200k_base');
      setOther({
        prompt_token: res as number,
      })
    })()

    Parser.parseFile(path).then(async (data) => {

      let estToken = 0;
      let estChunk = 0;
      let estimates: chunk_cont[] | { error: string };

      if (data.status && data.content) {
        try {
          estimates = await ChunkLogic.getChunk(data);
          
          if (Array.isArray(estimates) && estimates.length > 0) {

            if ('chunk_id' in estimates) {
              set_payloads(estimates);
            }
            
            estToken = estimates.reduce((acc: number, curr: any) => acc + curr.est_token, 0);
            estChunk = estimates.length;
          } 

          if ('error' in estimates) throw new Error(estimates.error);

          setIsParsed({
            status: data.status,
            data: {
              id: data.id,
              content: data.content,
            },
            estimates: {
              token: estToken,
              chunk: estChunk,
              chunksRaw: estimates
            },
          });

        } catch (e: any) {
          setIsParsed({
            status: false,
            message: e.message,
          });
        }

      }

      if (!data.status) {
        setIsParsed({
          status: data.status,
          message: 'message' in data ? data.message as string : 'Unknown error',
        });
      }
    });
  }, []);

  return isParsed.status === null ? (
    <Box>
      <Spinner />
      <Box marginLeft={2}>
        <Text color={palette.secondary}>Checking...</Text>
      </Box>
    </Box>
  ) : (
    <>
      {isParsed.status === true ? (
        <Box flexDirection="column" gap={1}>
          <Text>File ID: {isParsed.data?.id}</Text>
          <Text>File Path: {path}</Text>
          <Text>Lines: {isParsed.data?.content.length}</Text>
          <Text>Estimated Token Usage: {isParsed.estimates?.token || 0}</Text>
          <Box flexDirection="column" paddingLeft={2} gap={1}>
            <Text color={palette.secondary}>System Prompt: {other.prompt_token}</Text>
            <Text color={palette.secondary}>Content: {isParsed.estimates?.token! - other.prompt_token || undefined }</Text>
            <Text color={palette.secondary}>Token Tolerance: 1.2x</Text>
          </Box>
          <Text>Estimated Chunk count: {isParsed.estimates?.chunk || 0}</Text>
          <Box flexDirection="column" marginTop={2}>
            <Text>Do you want to continue?</Text>
            <SelectInput 
              items={[
                { label: "Yes", value: "yes" },
                { label: "No", value: "no" },
              ]}
              onSelect={(item) => {
                if (item.value === "yes") {
                  next(isParsed.estimates?.chunksRaw);
                }
                if (item.value === "no") {
                  quit();
                }
              }}
              indicatorComponent={CustomIndicator}
            />
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column">
          <Text color={palette.secondary}>Failed to parse file: </Text>
          <Box marginTop={1}>
            <Text color={palette.error}>{'message' in isParsed ? isParsed.message : 'Unknown error'}</Text>
          </Box>
          <Box flexDirection="column" marginTop={2}>
            <SelectInput
              items={[{ label: "Quit", value: "quit" }]}
              indicatorComponent={CustomIndicator}
              onSelect={(item) => {
                if (item.value === "quit") {
                  quit();
                }
              }}
            />
          </Box>
        </Box>
      )}
    </>
  );
};

// $s -f C:\Users\shin2\Downloads\input.pdf
