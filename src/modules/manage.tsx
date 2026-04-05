import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { palette } from "../assets/colors.ts";
import { useState } from "react";
import { Hints } from "./hints.module.tsx";
import { Edit } from "./edit/edit.module.tsx";

export type status = undefined | "start" | "history" | "edit" | "hint";

const IfStart = (): JSX.Element => {
  const [value, setValue] = useState<string>("");
  return (
    <>
      <Box width="100%" height="100%" paddingLeft={1} overflow="hidden">
        <TextInput
          placeholder="Input file path to extract"
          value={value}
          onChange={setValue}
        ></TextInput>
      </Box>
    </>
  );
};

export const ManageComponent = ({
  status,
  action,
  target,
  value,
}: {
  status: status;
  action: string;
  target: string;
  value: string;
}) => {
  switch (status) {
    case "start":
      return IfStart();
    case "history":
      return <Box><Text>History not implemented</Text></Box>;
    case "edit":
      return <Edit action={action} target={target} value={value} />;
    case "hint":
      return <Hints />;
    default:
      return <Box /> // Fallback for undefined or unknown
  }
};

export const cmd_filter = (
  command: string,
): { status: status; action: string; target: string; value: string } => {
  const trimmed = command
    .toLowerCase()
    .split(":")
    .map((item) => item.trim())
    // filter empty string
    .filter(Boolean);

  let form: {
    status: status;
    action: string;
    target: string;
    value: string;
  } = {
    status: trimmed[0] as status,
    action: trimmed[1] || "",
    target: trimmed[2] || "",
    value: trimmed[3] || "",
  };

  if (trimmed.length === 0) {
    form.status = undefined;
    return form;
  }

  if (trimmed[0] === "?") {
    form.status = "hint";
    return form;
  }

  if (trimmed[0] === "edit") {
    return form;
  }

  return form;
};
