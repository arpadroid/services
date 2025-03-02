import { getBuild } from '@arpadroid/module';
const { build = {} } = getBuild('services', 'library') || {};
export default build;
