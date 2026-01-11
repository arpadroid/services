import { getBuild } from '@arpadroid/module';
const { build = {} } = getBuild('services') || {};
export default build;
