import { getBuild } from '@arpadroid/module/src/rollup/builds/rollup-builds.mjs';
const { build } = getBuild('services', 'library');
export default build;
