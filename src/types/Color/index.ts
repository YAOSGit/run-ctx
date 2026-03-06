import { COLOR } from './Color.consts.js';

export { COLOR };
export type Color = (typeof COLOR)[keyof typeof COLOR];
