// src/cli.tsx
import React, { useState } from "react";
import { render, Box, Text, useStdout } from "ink";
import TextInput from "ink-text-input";
import { spawn } from "child_process";
import { art1 } from "./assets/ascii-art.ts";
import SelectInput from "ink-select-input";
import chalk from "chalk";
import os from "os";
import { palette } from "./assets/colors.ts";
import { ManageComponent } from "./modules/manage.tsx";
import { executeCommand } from "./modules/command.ts";
import { paths } from "./logic/utils/get_path.ts";

// ============ 1. create new terminal window ============
const openNewTerminal = (script: string): boolean => {
  const platform = os.platform();

  try {
    // macos
    if (platform === "darwin") {
      const script = `
        tell application "Terminal"
          activate
          do script "cd ${process.cwd()} && npm run ui"
        end tell
      `;
      spawn("osascript", ["-e", script], { detached: true, stdio: "ignore" });
      return true;
    }

    // windows
    if (platform === "win32") {
      spawn("cmd", ["/k", `cd /d ${process.cwd()} && npm run ui`], {
        detached: true,
        stdio: "ignore",
      });
      return true;
    }

    // linux
    if (platform === "linux") {
      const terminals = ["gnome-terminal", "konsole", "xfce4-terminal"];
      for (const term of terminals) {
        try {
          spawn(term, ["-e", `bash -c "cd ${process.cwd()} && npm run ui"`], {
            detached: true,
            stdio: "ignore",
          });
          return true;
        } catch {
          continue;
        }
      }
    }

    return false;
  } catch (error) {
    console.error("Failed to open new terminal:", error);
    return false;
  }
};

// ============ 2. UI ============

const App = () => {
  const [value, setValue] = useState("");

  const [component, setComponent] = useState<JSX.Element | null>(null);

  const { stdout } = useStdout();
  const [width, height] = [stdout.columns, stdout.rows];

  return (
    <>
      <Box flexDirection="column" height="100%" width="100%">
        <Box key="result" height={24} width="100%" flexDirection="row">
          <Box width="100%" height="100%" overflow="hidden" paddingLeft={1}>
            {component ? (
              component
            ) : (
              <Text bold color={palette.primary}>
                {art1}
              </Text>
            )}
          </Box>
        </Box>
        <Box key="control" flexDirection="column" height="30%" width="100%">
          <Box height={6} flexDirection="column">
            <Box key="border_top">
              <Text color={palette.muted}>{"─".repeat(width)}</Text>
            </Box>
            <Box flexDirection="row">
              <Box marginRight={1}>
                <Text color="white" bold>
                  {">"}
                </Text>
              </Box>
              <TextInput
                value={value}
                onChange={setValue}
                onSubmit={async (value) => {
                  if (value) {
                    const result = await executeCommand(value);
                    setComponent(<ManageComponent key={Date.now()} {...result} />);
                  }
                  setValue("");
                }}
                placeholder=":extract = extract file | :edit = edit file | :? = hints"
              ></TextInput>
            </Box>
            <Box key="border_bottom">
              <Text color={palette.muted}>{"─".repeat(width)}</Text>
            </Box>
            <Box
              flexDirection="row"
              justifyContent="space-between"
              marginTop={1}
            >
              <Text color={palette.secondary}>
                {":? for hints"}
              </Text>
              <Text color={palette.secondary}>{"Exit by Ctrl + C"}</Text>
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

// ============ 3. main ============
const main = () => {
  const args = process.argv.slice(2);

  // run in new terminal if includes --ui
  if (args.includes("--ui")) {
    render(<App />, { exitOnCtrlC: true });
    return;
  }

  const success = openNewTerminal("npm run ui -s");

  if (success) {
    console.log("✓ UI opened in new terminal window");
    console.log("✓ Base terminal is now free");
    process.exit(0);
  } else {
    console.log("⚠ Could not open new terminal, running in current window...");
    render(<App />, { exitOnCtrlC: true });
  }
};

// main will be called for twice and when it is called for the second time, it will run the UI
main();
