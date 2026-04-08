import { Box, Text } from "ink";
import { useState } from "react";
import { Check } from "./check.tsx";
import { palette } from "../../assets/colors.ts";
import { Start } from "./start.tsx";
import type { chunk_cont } from "../../logic/interface/session.interface.ts";

type process = 'check' | 'start' | 'done' | null

export const IfStart = ({path}: {path: string}): JSX.Element => {
  const [sessionPayloads, setSessionPayloads] = useState<chunk_cont[] | undefined>();

  const [process, setProcess] = useState<process>("check");

  return (
    <>
      <Box width="100%" height="100%" paddingLeft={1} overflow="hidden">
        {process === "check" && (
          <Box flexDirection="column">
            <Check 
              next={(chunks) => {
                 setSessionPayloads(chunks);
                 setProcess("start");
              }} 
              quit={() => setProcess(null)} 
              path={path} 
              set_payloads={setSessionPayloads}
            />
          </Box>
        )}
        {process === "start" && (
          <Box flexDirection="column">
            <Start next={() => setProcess("done")} quit={() => setProcess(null)} path={path} payloads={sessionPayloads} />
          </Box>
        )}
        {process === "done" && (
          <Box flexDirection="column">
            <Text>Extraction completed!</Text>
          </Box>
        )}
        {process === null && (
          <Box flexDirection="column" marginTop={1}>
            <Text color={palette.warning}>✖ Operation manually terminated.</Text>
            <Text color={palette.muted}>Ready for next command.</Text>
          </Box>
        )}
      </Box>
    </>
  );
};