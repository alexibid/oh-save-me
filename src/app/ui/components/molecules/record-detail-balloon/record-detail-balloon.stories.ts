import type { Meta, StoryObj } from '@storybook/angular';
import { RecordDetailBalloonComponent } from './record-detail-balloon';
import { TRANSACTION_LIST_SCHEMA } from '@domain/models/transaction-list-schema';

const meta: Meta<RecordDetailBalloonComponent> = { component: RecordDetailBalloonComponent, tags: ['autodocs'] };
export default meta;

export const Closed: StoryObj<RecordDetailBalloonComponent> = {
  args: {
    schema: TRANSACTION_LIST_SCHEMA,
    record: {
      id: 't1',
      date: '2026-08-02',
      description: 'cantina do bairro',
      amount: -18.5,
      category: 'Restaurants',
      balance: 12480,
      account: 'principal'
    }
  }
};

export const WithPinAction: StoryObj<RecordDetailBalloonComponent> = {
  args: { ...Closed.args, showActions: true, isPinned: false }
};
