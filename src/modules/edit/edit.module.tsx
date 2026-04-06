import { Box, Text, useInput, useStdout } from "ink";
import { configManager } from "../../config-util.ts";
import { type ConfigSchema } from "../../assets/schema.ts";
import { useRef, useEffect } from "react";
import { ScrollView, type ScrollViewRef } from "ink-scroll-view";
import { palette } from "../../assets/colors.ts";
import chalk from 'chalk';

const findKeyPath = (
  obj: any,
  targetKey: string,
  currentPath: string = "",
): string | null => {
  if (obj === null || typeof obj !== "object") return null;

  if (targetKey in obj) {
    // path to current layer
    return currentPath ? `${currentPath}.${targetKey}` : targetKey;
  }

  for (const [key, value] of Object.entries(obj)) {
    const newPath = currentPath ? `${currentPath}.${key}` : key;
    const foundPath = findKeyPath(value, targetKey, newPath);
    if (foundPath) return foundPath;
  }

  return null;
};

export const Edit = ({
  action,
  target,
  value,
}: {
  action: string;
  target: string;
  value: string;
}): JSX.Element => {
  const scrollRef = useRef<ScrollViewRef>(null);

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

  const scroll_view = (content: JSX.Element) => {
    return (
      <ScrollView ref={scrollRef}>
        <Box flexDirection="column">{content}</Box>
      </ScrollView>
    );
  };

  if (action === "get" && target === "all") {
    return scroll_view(get_obj(configManager.config.store));
  }

  const realPath = configManager.config.has(target)
    ? target
    : findKeyPath(configManager.config.store, target);

  if (!realPath) {
    return scroll_view(
      <Text color="red">✖ Key '{target}' not found in configuration.</Text>,
    );
  }

  switch (action) {
    case "get":
      return scroll_view(
        get_one(realPath, configManager.config.get(realPath as any)),
      );

    case "set":
      return scroll_view(set_one(realPath, value));

    default:
      return scroll_view(<Text color="red">✖ Unknown action: {action}</Text>);
  }
};

const flattenObj = (
  obj: any,
  result: { [key: string]: string | number } = {},
) => {
  // iterate through keys of obj
  for (let key in obj) {
    // if value is object and not null
    if (typeof obj[key] === "object" && obj[key] !== null) {
      // recursively call flattenObj
      flattenObj(obj[key], result);
    } else {
      // if value is not object, add it to result
      // key will be repalce if exists
      result[key] = obj[key];
    }
  }

  // return the result
  return result;
};

const set_one = (path: string, value: string) => {
  try {
    let parsedValue: any = value;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      // Keep as string if it's not valid JSON
    }

    const prev = configManager.config.get(path as any);

    configManager.config.set(path as any, parsedValue);
    return (
      <Box flexDirection="column">
        <Text color={palette.success}>✔ Successfully set {path}</Text>
        <Box marginTop={1} paddingLeft={2}>
          <Text>
            {prev} {chalk.hex(palette.muted)("→")} {parsedValue}
          </Text>
        </Box>
      </Box>
    );
  } catch (err: any) {
    return <Text color="red">✖ Error setting config: {err.message}</Text>;
  }
};

const get_obj = (config: any) => {
  return (
    <>
      {Object.entries(config).map(([key, value]) => {
        return (
          <Box flexDirection="column">
            <Box paddingLeft={2} marginTop={2}>
              <Text color={palette.primary}>{key}:</Text>
            </Box>
            <Box paddingLeft={1} marginBottom={1} >
              <Text color={palette.muted}>{"=".repeat(20)}</Text>
            </Box>
            {Object.entries(flattenObj(value)).map(([key, value]) => {
              return (
                <Box paddingLeft={2} marginBottom={1}>
                  <Text>
                    {chalk.hex(palette.success)(key)}: {value}
                  </Text>
                </Box>
              );
            })}
          </Box>
        );
      })}
    </>
  );
};

const get_one = (target: string, value: any) => {
  return typeof value !== "object" || value === null ? (
    <Box flexDirection="column">
      <Text>
        {chalk.hex(palette.success)(target)}: {value}
      </Text>
    </Box>
  ) : (
    get_obj({ [target]: value })
  );
};
