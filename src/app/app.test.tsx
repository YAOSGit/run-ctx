import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useConfig } from '../providers/ConfigProvider/index.js';
import { useNavigation } from '../providers/NavigationProvider/index.js';
import { AppContent } from './app.js';

vi.mock('../providers/ConfigProvider/index.js', () => ({
	useConfig: vi.fn(),
}));

vi.mock('../providers/NavigationProvider/index.js', () => ({
	useNavigation: vi.fn(),
}));

// We mock the child TUI components so we don't need Ink's renderer in a plain React test
vi.mock('../components/AliasList/index.js', () => ({
	default: () => <div data-testid="alias-list" />,
}));
vi.mock('../components/RuleDetail/index.js', () => ({
	default: () => <div data-testid="rule-detail" />,
}));
vi.mock('../components/RuleEditor/index.js', () => ({
	default: () => <div data-testid="rule-editor" />,
}));

describe('AppContent', () => {
	const mockConfig = {
		aliases: {
			dev: { rules: [] },
		},
	};
	let mockNavigateTo: any;
	let mockGoBack: any;
	let mockUpdateConfig: any;

	beforeEach(() => {
		mockNavigateTo = vi.fn();
		mockGoBack = vi.fn();
		mockUpdateConfig = vi.fn();

		vi.mocked(useConfig).mockReturnValue({
			config: mockConfig as any,
			updateConfig: mockUpdateConfig,
		});

		vi.mocked(useNavigation).mockReturnValue({
			screen: { type: 'alias-list' },
			navigateTo: mockNavigateTo,
			goBack: mockGoBack,
		});
	});

	it('renders AliasList when screen type is alias-list', () => {
		const { getByTestId } = render(<AppContent />);
		expect(getByTestId('alias-list')).toBeDefined();
	});

	it('renders RuleEditor when screen type is rule-editor and alias exists', () => {
		vi.mocked(useNavigation).mockReturnValue({
			screen: { type: 'rule-editor', aliasName: 'dev' },
			navigateTo: mockNavigateTo,
			goBack: mockGoBack,
		});
		const { getByTestId } = render(<AppContent />);
		expect(getByTestId('rule-editor')).toBeDefined();
	});

	it('redirects to alias-list when rule-editor alias is missing', () => {
		vi.mocked(useNavigation).mockReturnValue({
			screen: { type: 'rule-editor', aliasName: 'missing' },
			navigateTo: mockNavigateTo,
			goBack: mockGoBack,
		});
		const { container } = render(<AppContent />);
		expect(mockNavigateTo).toHaveBeenCalledWith({ type: 'alias-list' });
		expect(container.innerHTML).toBe(''); // renders null during redirect
	});

	it('renders RuleDetail when screen type is rule-detail and rule exists', () => {
		const configWithRule = {
			aliases: {
				dev: { rules: [{ command: 'echo hello', match: {} }] },
			},
		};
		vi.mocked(useConfig).mockReturnValue({
			config: configWithRule as any,
			updateConfig: mockUpdateConfig,
		});
		vi.mocked(useNavigation).mockReturnValue({
			screen: { type: 'rule-detail', aliasName: 'dev', ruleIndex: 0 },
			navigateTo: mockNavigateTo,
			goBack: mockGoBack,
		});

		const { getByTestId } = render(<AppContent />);
		expect(getByTestId('rule-detail')).toBeDefined();
	});

	it('redirects to alias-list when rule-detail rule is missing', () => {
		vi.mocked(useNavigation).mockReturnValue({
			screen: { type: 'rule-detail', aliasName: 'dev', ruleIndex: 1 },
			navigateTo: mockNavigateTo,
			goBack: mockGoBack,
		});
		const { container } = render(<AppContent />);
		expect(mockNavigateTo).toHaveBeenCalledWith({ type: 'alias-list' });
		expect(container.innerHTML).toBe('');
	});
});
