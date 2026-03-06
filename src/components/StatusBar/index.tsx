import { Box, Text } from 'ink';
import { COLOR } from '../../types/Color/index.js';
import type { StatusBarProps } from './StatusBar.types.js';

export function StatusBar({ children }: StatusBarProps) {
	return (
		<Box
			marginTop={1}
			borderStyle="round"
			borderColor={COLOR.GRAY}
			paddingX={1}
		>
			<Text wrap="end">
				<Text bold color={COLOR.MAGENTA}>
					YAOSGit
					<Text dimColor> : </Text>
					ctx
				</Text>
				<Text dimColor> │ </Text>
				{children}
			</Text>
		</Box>
	);
}
