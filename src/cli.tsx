// src/cli.tsx
import React, { useState } from "react";
import { render, Box, Text } from "ink";
import TextInput from "ink-text-input";
import { spawn } from "child_process";
import { art1 } from "./assets/ascii-art.ts";
import SelectInput from "ink-select-input";
import chalk from "chalk";
import os from "os";
import { palette } from "./assets/colors.ts";

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
import { module_config } from "./cli-ui.ts";
import { type status, HandleStatus, type ComponentPosition } from "./modules/manage.tsx";

const App = () => {
  const [value, setValue] = useState<status>(null);

  const [components, setComponents] = useState<
    Record<ComponentPosition, React.ReactNode | null>
  >({
    showResult: null,
    showOthers: null,
    control_left: null,
    control_right: null
  });

  const setComponent = (
    position: ComponentPosition,
    content: React.ReactNode | null,
  ) => {
    setComponents((prev) => ({ ...prev, [position]: content }));
  };

  const CustomItem = ({ label, isSelected }: any) => (
    <Text color={isSelected ? palette.select : "white"}>
      {isSelected ? `⨠ ${label}` : `  ${label}`}
    </Text>
  );

  return (
    <Box flexDirection="column" {...module_config.window_size}>
      <Box key="show-window" flexDirection="row">
        <Box {...module_config.a_item.r} key="showResult"></Box>
        <Box {...module_config.a_item.l} key="showOthers"></Box>
      </Box>
      <Box key="control-center">
        <Box
          {...module_config.b_item.r}
          key="control_left"
          paddingLeft={1}
          paddingRight={1}
        >
          <SelectInput
            items={[
              { label: "Start Data Extraction", value: "start" },
              { label: "Edit Configs", value: "edit" },
              { label: "View History", value: "history" },
            ]}
            onSelect={(item) => {
              setValue(item.value as status);
              const res = HandleStatus({ status: item.value as status });
              setComponent(res?.position!, <HandleStatus status={item.value as status} />);
            }}
            // make original arrow invisible
            indicatorComponent={() => null}
            // custom selected item
            itemComponent={CustomItem}
          />
        </Box>
        <Box {...module_config.b_item.l} key="control_right"></Box>
      </Box>
    </Box>
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
