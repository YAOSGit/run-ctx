import { fileURLToPath } from 'node:url';
import { realpathSync } from 'node:fs';
const main = process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
console.log('is main?', main);
