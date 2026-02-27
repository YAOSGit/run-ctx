import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const main =
	process.argv[1] &&
	realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
console.log('is main?', main);
