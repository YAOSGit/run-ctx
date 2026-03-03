import { Box, Text } from 'ink';
import type React from 'react';
import { COLOR } from '../../types/Color/index.js';

type StatusBarProps = {
	children: React.ReactNode;
};

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
