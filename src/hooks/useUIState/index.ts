import { useCallback, useMemo, useState } from 'react';
import type { OverlayState, PendingConfirmation } from '@yaos-git/toolkit/types';

export type RunCtxOverlay = 'help';

type UIState = {
	overlay: RunCtxOverlay | 'none';
	confirmation: PendingConfirmation | null;
	inputActive: boolean;
};

export type UseUIStateReturn = OverlayState<RunCtxOverlay> & {
	cycleFocus: () => void;
	/** True while a component is capturing raw text input (e.g. creating an alias, searching). */
	inputActive: boolean;
	setInputActive: (active: boolean) => void;
};

export function useUIState(): UseUIStateReturn {
	const [state, setState] = useState<UIState>({
		overlay: 'none',
		confirmation: null,
		inputActive: false,
	});

	const setActiveOverlay = useCallback((overlay: RunCtxOverlay | 'none') => {
		setState((s) => ({ ...s, overlay }));
	}, []);

	const requestConfirmation = useCallback((message: string, onConfirm: () => void) => {
		setState((s) => ({ ...s, confirmation: { message, onConfirm } }));
	}, []);

	const clearConfirmation = useCallback(() => {
		setState((s) => ({ ...s, confirmation: null }));
	}, []);

	const cycleFocus = useCallback(() => {}, []);

	const setInputActive = useCallback((active: boolean) => {
		setState((s) => ({ ...s, inputActive: active }));
	}, []);

	return useMemo(
		() => ({
			activeOverlay: state.overlay,
			setActiveOverlay,
			confirmation: state.confirmation,
			requestConfirmation,
			clearConfirmation,
			cycleFocus,
			inputActive: state.inputActive,
			setInputActive,
		}),
		[state, setActiveOverlay, requestConfirmation, clearConfirmation, cycleFocus, setInputActive],
	);
}
