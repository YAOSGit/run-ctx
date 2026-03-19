import type { BaseDeps, Command } from '@yaos-git/toolkit/types';
import type { Screen } from '../hooks/useNavigation/index.js';
import type { RunCtxOverlay, UseUIStateReturn } from '../hooks/useUIState/index.js';

export type RunCtxDeps = BaseDeps<RunCtxOverlay> & {
	ui: UseUIStateReturn;
	screen: Screen;
	goBack: () => void;
};

export type RunCtxCommand = Command<RunCtxDeps>;
