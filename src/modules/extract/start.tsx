import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { palette } from "../../assets/colors.ts";

export const Start = ({next, quit, path}: {next: () => void, quit: () => void, path: string}) => {
  return (
    <Box>
      <Spinner />
      <Box marginLeft={2}>
        <Text color={palette.secondary}>Checking model connection...</Text>
      </Box>
    </Box>
  )
}