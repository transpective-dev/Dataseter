import {
  Box,
  Text,
  useStdout,
  useInput,
  measureElement,
  type DOMElement,
} from "ink";
import { palette } from "../assets/colors.ts";
import chalk from "chalk";
import { useRef, useEffect, useState } from "react";
import { ScrollView, type ScrollViewRef } from "ink-scroll-view";
import { stderr } from "node:process";

const ls = {
  cmd: {
    extract: {
      desc: "extract file",
      usage: ":extract <file_path>",
    },
    edit: {
      desc: "edit configs",
      usage: ":edit <action> <name>? <value>?",
    },
    "?": {
      desc: "show hints",
      usage: ":?",
    },
  }
};

export const Hints = () => {
  const scrollRef = useRef<ScrollViewRef>(null);
  const maxHeight = 24;

  const { stdout } = useStdout();

  useEffect(() => {
    const handleResize = () => scrollRef.current?.remeasure();
    stdout?.on("resize", handleResize);
    return () => {
      stdout?.off("resize", handleResize);
    };
    // dispose when unmount
  }, [stdout]);

  useInput((input, key) => {
    if (key.upArrow) {
      scrollRef.current?.scrollBy(-1); // Scroll up 1 line
    }
    if (key.downArrow) {
      scrollRef.current?.scrollBy(1); // Scroll down 1 line
    }
  });

  return (
    <ScrollView ref={scrollRef} height={maxHeight}>
      <Box flexDirection="column">
        {Object.entries(ls).map(([key_1, value]) => {
          return (
            <Box marginBottom={2} flexDirection="column">
              <Text color={palette.primary}>{"::" + key_1}</Text>
              <Text color={palette.secondary}>{"=".repeat(20)}</Text>
              {Object.entries(value).map(([key_2, value]) => {
                return (
                  <Box
                    marginBottom={1}
                    key={key_2}
                    paddingLeft={1}
                    flexDirection="column"
                  >
                    <Text>
                      {chalk.hex(palette.success)(key_2) + ": " + value.desc}
                    </Text>
                    <Text color={palette.secondary}>
                      {"-usage: " + value.usage}
                    </Text>
                  </Box>
                );
              })}
            </Box>
          );
        })}
      </Box>
    </ScrollView>
  );
};
