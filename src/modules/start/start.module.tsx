import { Box, Text } from "ink";
import { useState } from "react";
import { Check } from "./check.tsx";
import { palette } from "../../assets/colors.ts";

type process = 'check' | 'start' | 'done' | null

export const IfStart = ({path}: {path: string}): JSX.Element => {
  const [value, setValue] = useState<string>("");

  const [process, setProcess] = useState<process>("check");

  return (
    <>
      <Box width="100%" height="100%" paddingLeft={1} overflow="hidden">
        {process === "check" && (
          <Box flexDirection="column">
            <Check next={() => setProcess("start")} quit={() => setProcess(null)} path={path} />
          </Box>
        )}
        {process === "start" && (
          <Box flexDirection="column">
            <Text>Starting extraction...</Text>
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