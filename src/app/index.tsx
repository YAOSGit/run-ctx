import type React from 'react';
import { AppContent } from './app.js';
import { AppProviders } from './providers.js';

const App: React.FC = () => {
	return (
		<AppProviders>
			<AppContent />
		</AppProviders>
	);
};

export default App;
