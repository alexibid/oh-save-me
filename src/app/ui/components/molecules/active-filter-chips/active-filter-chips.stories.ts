import type { Meta, StoryObj } from '@storybook/angular';
import { ActiveFilterChipsComponent } from './active-filter-chips';

const meta: Meta<ActiveFilterChipsComponent> = { component: ActiveFilterChipsComponent, tags: ['autodocs'] };
export default meta;

export const Empty: StoryObj<ActiveFilterChipsComponent> = { args: { chips: [] } };
export const WithFilters: StoryObj<ActiveFilterChipsComponent> = {
  args: {
    chips: [
      { id: 'account', label: 'conta: cartão de crédito' },
      { id: 'category', label: 'mercearia', colorFamily: 'teal' }
    ]
  }
};
