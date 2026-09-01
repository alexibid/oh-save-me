import type { Meta, StoryObj } from '@storybook/angular';
import { Header } from './header';

const meta: Meta<Header> = { component: Header, tags: ['autodocs'] };
export default meta;
export const Primary: StoryObj<Header> = {};
export const SidenavOpen: StoryObj<Header> = {
  args: { isSidenavOpen: true }
};
