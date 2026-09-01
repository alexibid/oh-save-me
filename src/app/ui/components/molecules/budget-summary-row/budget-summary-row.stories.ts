import type { Meta, StoryObj } from '@storybook/angular';
import { BudgetSummaryRowComponent } from './budget-summary-row';

const meta: Meta<BudgetSummaryRowComponent> = { component: BudgetSummaryRowComponent, tags: ['autodocs'] };
export default meta;

export const Positive: StoryObj<BudgetSummaryRowComponent> = { args: { label: 'orçamento geral', value: 220 } };
export const OverBudget: StoryObj<BudgetSummaryRowComponent> = { args: { label: 'restaurantes', value: -45 } };
