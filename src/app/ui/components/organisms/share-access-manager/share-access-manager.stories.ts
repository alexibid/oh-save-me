import type { Meta, StoryObj } from '@storybook/angular';
import { ShareAccessManagerComponent } from './share-access-manager';

const meta: Meta<ShareAccessManagerComponent> = {
  component: ShareAccessManagerComponent,
  tags: ['autodocs']
};

export default meta;
export const Primary: StoryObj<ShareAccessManagerComponent> = {
  args: {
    selectedEmails: ['shared@example.com']
  }
};
