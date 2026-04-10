import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useState, useEffect } from "react";
import { palette } from "../../assets/colors.ts";
import { SessionManager } from "../../logic/core/session/adapter.ts";
import {
  type session_execute_p,
  type schema_base,
  type extracted_data,
} from "../../logic/interface/session.interface.ts";
import { type chunk_cont } from "../../logic/interface/session.interface.ts";
import { emitter } from "../../emitter.ts";
import type { session_queue, emit_token } from "../../logic/interface/general.interface.ts";

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
  const [stream, setStream] = useState<Map<string, emit_token>>(new Map());
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [queue, setQueue] = useState<Map<string, session_queue>>(new Map());

  useEffect(() => {
    const handleToken = (payload: any) => {
      // Create a shallow copy to force React to trigger a re-render
      setStream(new Map(payload instanceof Map ? payload : Object.entries(payload)));
    };

    const handleQueue = (payload: any) => {
      // In case adapter sends { queue: Map }, extract it
      const q = payload?.queue || payload;
      setQueue(new Map(q instanceof Map ? q : Object.entries(q)));
    };

    emitter.on("token", handleToken);
    emitter.on("session", handleQueue);

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
      emitter.off("session", handleQueue); 
    };
  }, []);

  return (
    <Box flexDirection="column" gap={1}>
      {status === "running" && (
        <Box>
          <Spinner />
          <Box marginLeft={2} gap={1} flexDirection="column">
            <Text color={palette.secondary}>
              Connecting to adapter & parsing {queue.size} chunks...
            </Text>
            <Box gap={1} flexDirection="column">
              {Array.from(queue.values()).map((item) => (
                <Box flexDirection="row" gap={1}>
                  <Text>{item.id}</Text>
                  <Text color={palette.secondary}>|</Text>
                  <Text>{item.time}</Text>
                  <Text color={palette.secondary}>|</Text>
                  <Text>{stream.get(item.id)?.token.slice(Math.max(0, stream.get(item.id)?.token.length! - 30), stream.get(item.id)?.token.length)}</Text>
                </Box>
              ))}
            </Box>
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
