import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useState, useEffect } from "react";
import { palette } from "../../assets/colors.ts";
import { SessionManager } from "../../logic/core/session/adapter.ts";
import {
  type session_execute_p,
  type schema_base,
} from "../../logic/interface/session.interface.ts";
import { type chunk_cont } from "../../logic/interface/session.interface.ts";
import { emitter } from "../../emitter.ts";

export const Start = ({
  next,
  quit,
  path,
  payloads,
}: {
  next: () => void;
  quit: () => void;
  path: string;
  payloads: chunk_cont[] | undefined;
}) => {
  const [status, setStatus] = useState<"running" | "error" | "done">("running");
  const [stream, setStream] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const handleToken = (token: string) => {
      setStream(token);
    };

    emitter.on("token", handleToken);

    const runExtraction = async () => {
      try {
        await SessionManager.launchSessions(payloads ? payloads : []);

        setStatus("done");
        setTimeout(() => next(), 1500);
      } catch (e: any) {
        setStatus("error");
        setErrorMsg(e.message || "Unknown error occurred during extraction.");
      }
    };

    runExtraction();

    return () => {
      emitter.off("token", handleToken);
    };
  }, []);

  return (
    <Box flexDirection="column" gap={1}>
      {status === "running" && (
        <Box>
          <Spinner />
          <Box marginLeft={2}>
            <Text color={palette.secondary}>
              Connecting to adapter & parsing {payloads?.length} chunks...
            </Text>
            <Text>{stream}</Text>
          </Box>
        </Box>
      )}

      {status === "error" && (
        <Box flexDirection="column">
          <Text color={palette.error}>✖ Extraction Failed</Text>
          <Text color={palette.secondary}>{errorMsg}</Text>
        </Box>
      )}

      {status === "done" && (
        <Box>
          <Text color={palette.success}>
            ✔ Extraction completed successfully
          </Text>
        </Box>
      )}
    </Box>
  );
};
