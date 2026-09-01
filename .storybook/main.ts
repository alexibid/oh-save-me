import { createStorybookConfig } from '../../../tools/storybook/create-config';

export default createStorybookConfig(import.meta.url, { composeDesignSystem: true });
