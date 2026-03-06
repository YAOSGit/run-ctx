import { AppContent } from './app.js';
import { AppProviders } from './providers.js';

export function App() {
	return (
		<AppProviders>
			<AppContent />
		</AppProviders>
	);
}
