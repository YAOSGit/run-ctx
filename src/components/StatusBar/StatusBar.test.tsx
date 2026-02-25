import { render } from 'ink-testing-library';
import { describe, expect, it } from 'vitest';
import StatusBar from './index.js';

describe('StatusBar', () => {
	it('renders without crashing', () => {
		const { lastFrame } = render(<StatusBar>test content</StatusBar>);
		expect(lastFrame()).toBeDefined();
	});

	it('displays the branding text', () => {
		const { lastFrame } = render(<StatusBar>placeholder</StatusBar>);
		expect(lastFrame()).toContain('YAOSGit');
		expect(lastFrame()).toContain('ctx');
	});

	it('displays the separator between branding and children', () => {
		const { lastFrame } = render(<StatusBar>placeholder</StatusBar>);
		expect(lastFrame()).toContain(':');
		expect(lastFrame()).toContain('│');
	});

	it('renders children content', () => {
		const { lastFrame } = render(<StatusBar>my status message</StatusBar>);
		expect(lastFrame()).toContain('my status message');
	});

	it('renders JSX children', () => {
		const { lastFrame } = render(
			<StatusBar>
				<>first segment — second segment</>
			</StatusBar>,
		);
		expect(lastFrame()).toContain('first segment');
		expect(lastFrame()).toContain('second segment');
	});
});
