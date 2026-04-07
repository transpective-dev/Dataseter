
import { Text } from "ink";

export const CustomIndicator = ({ isSelected }: any) => {
	if (!isSelected) {
		return <Text> </Text>;
	}

	return (
		<Text color="magenta">
			{'> '}
		</Text>
	);
};