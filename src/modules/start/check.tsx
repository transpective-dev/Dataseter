import SelectInput from "ink-select-input";
import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useState, useEffect } from "react";
import { palette } from "../../assets/colors.ts";
import { Parser } from "../../logic/core/parsers/baseParser.ts";
import { ChunkLogic } from "../../logic/core/chunking/chunker.ts";

export const Check = ({
  next,
  quit,
  path,
}: {
  next: () => void;
  quit: () => void;
  path: string;
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
    } | null;
  } | {
      status: false,
      message: string,
    }>({
    status: null,
    data: null,
    estimates: null,
  });

  useEffect(() => {
    Parser.parseFile(path).then(async (data) => {

      let estToken = 0;
      let estChunk = 0;
      let estimates: any;

      if (data.status && data.content) {
        try {
          estimates = await ChunkLogic.getChunk(data);
          
          if (Array.isArray(estimates) && estimates.length > 0) {
              estToken = estimates.reduce((acc: number, curr: any) => acc + curr.est_token, 0);
              estChunk = estimates.length;
          } 

          if (estimates.error) throw new Error(estimates.error);

          setIsParsed({
            status: data.status,
            data: {
              id: data.id,
              content: data.content,
            },
            estimates: {
              token: estToken,
              chunk: estChunk,
            },
          });

        } catch (e: any) {
          setIsParsed({
            status: false,
            message: e.message,
          });
        }

      } else {
        setIsParsed({
          status: data.status,
          data: {
            id: data.id || "",
            content: data.content ? data.content : [],
          },
          estimates: null,
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
        <Box flexDirection="column">
          <Text>File ID: {isParsed.data?.id}</Text>
          <Text>File Path: {path}</Text>
          <Text>Lines: {isParsed.data?.content.length}</Text>
          <Text>Estimated Token Usage: {isParsed.estimates?.token || 0}</Text>
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
                  next();
                }
                if (item.value === "no") {
                  quit();
                }
              }}
            />
          </Box>
        </Box>
      ) : (
        <Box flexDirection="column">
          <Text color={palette.secondary}>Failed to parse file: </Text>
          <Text color={palette.error}>{'message' in isParsed ? isParsed.message : 'Unknown error'}</Text>
          <Box flexDirection="column" marginTop={2}>
            <SelectInput
              items={[{ label: "Quit", value: "quit" }]}
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
