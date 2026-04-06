import { Box, Text } from "ink";
import TextInput from "ink-text-input";
import { palette } from "../assets/colors.ts";
import { useState } from "react";
import { Hints } from "./hints.module.tsx";
import { Edit } from "./edit/edit.module.tsx";  
import { IfStart } from "./start/start.module.tsx";

export type status = undefined | "extract" | "history" |  "config" | "hint";

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
    case "extract":
      return <IfStart path={value} />;
    case "history":
      return <Box><Text>History not implemented</Text></Box>;
    case "config":
      return <Edit action={action} target={target} value={value} />;
    case "hint":
      return <Hints />;
    default:
      return <Box /> // Fallback for undefined or unknown
  }
};