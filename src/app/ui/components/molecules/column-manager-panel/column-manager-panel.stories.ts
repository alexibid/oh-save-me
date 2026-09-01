import type { Meta, StoryObj } from '@storybook/angular';
import { ColumnManagerPanelComponent } from './column-manager-panel';

const meta: Meta<ColumnManagerPanelComponent> = { component: ColumnManagerPanelComponent, tags: ['autodocs'] };
export default meta;

export const Primary: StoryObj<ColumnManagerPanelComponent> = {
  args: {
    items: [
      { key: 'date', labelKey: 'thDate', visible: true, locked: true },
      { key: 'description', labelKey: 'thDescription', visible: true, locked: true },
      { key: 'amount', labelKey: 'thAmount', visible: true, locked: true },
      { key: 'category', labelKey: 'thCategory', visible: true, locked: true },
      { key: 'balance', labelKey: 'movementsHeaderBalance', visible: false, locked: false },
      { key: 'account', labelKey: 'movementsHeaderAccount', visible: false, locked: false },
      { key: 'budget', labelKey: 'movementsHeaderBudgets', visible: false, locked: false }
    ]
  }
};
