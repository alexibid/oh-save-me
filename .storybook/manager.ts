import { addons } from 'storybook/manager-api';
import { ibidTheme } from '../../../tools/storybook/theme';

addons.setConfig({ theme: { ...ibidTheme, brandTitle: 'Oh Save Me! — Product' } });
