import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { palette } from "../assets/colors.ts";
import { useState } from "react";

export type status = null | "start" | "history" | "edit";

export type ComponentPosition =
  | "showResult"
  | "showOthers"
  | "control_left"
  | "control_right";

type returnComponent = {
  position: ComponentPosition;
  content: JSX.Element;
};

const IfEdit = (): returnComponent => {
  const [value, setValue] = useState<string>("");
  return {
    position: "showResult",
    content: (
      <>
        <Box
          borderStyle="round"
          borderColor={palette.select}
          width="100%"
          height="100%"
        >
          <TextInput
            placeholder="Input file path to extract"
            value={value}
            onChange={setValue}
          ></TextInput>
        </Box>
      </>
    ),
  };
};

const IfStart = (): returnComponent => {
  const [value, setValue] = useState<string>("");
  return {
    position: "control_left",
    content: (
      <>
        <Box
          borderStyle="round"
          borderColor={palette.select}
          width="100%"
          height={3}
          paddingLeft={1}
        >
          <TextInput
            placeholder="Input file path to extract"
            value={value}
            onChange={setValue}
          ></TextInput>
        </Box>
      </>
    ),
  };
};

export const HandleStatus = ({ status }: { status: status }) => {
  switch (status) {
    case "start":
      return IfStart();
    case "history":
      break;
    case "edit":
      return IfEdit();
  }
};
