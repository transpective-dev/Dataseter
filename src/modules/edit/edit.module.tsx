import { Box, Text } from "ink";
import { configManager } from "../../config-util.ts";
import { type ConfigSchema } from "../../assets/schema.ts";

const findKeyPath = (obj: any, targetKey: string, currentPath: string = ""): string | null => {
  if (obj === null || typeof obj !== "object") return null;
  
  if (targetKey in obj) {
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

  if (action === "get" && target === "all") {
    return get_all(configManager.config.store);
  }

  const realPath = configManager.config.has(target) 
    ? target 
    : findKeyPath(configManager.config.store, target);

  if (!realPath) {
    return <Text color="red">✖ Key '{target}' not found in configuration.</Text>;
  }

  switch (action) {
    case "get":
      return get_one(realPath, configManager.config.get(realPath as any));
      
    case "set":
      return set_one(realPath, value);

    default:
      return <Text color="red">✖ Unknown action: {action}</Text>;
  }
};

const set_one = (path: string, value: string) => {
  try {
    let parsedValue: any = value;
    try {
      parsedValue = JSON.parse(value);
    } catch {
      // Keep as string if it's not valid JSON
    }
    
    configManager.config.set(path as any, parsedValue);
    return (
      <Box flexDirection="column">
        <Text color="green">✔ Successfully set {path}</Text>
        <Text>{path}: {JSON.stringify(parsedValue, null, 2)}</Text>
      </Box>
    );
  } catch (err: any) {
    return <Text color="red">✖ Error setting config: {err.message}</Text>;
  }
};

const get_all = (config: ConfigSchema) => {
    return (
        <Box flexDirection="column">
            <Text>{JSON.stringify(config, null, 2)}</Text>
        </Box>
    );
};

const get_one = (target: string, value: any) => {
    return (
        <Box flexDirection="column">
            <Text color="cyan">{target}:</Text>
            <Text>{JSON.stringify(value, null, 2)}</Text>
        </Box>
    );
};
