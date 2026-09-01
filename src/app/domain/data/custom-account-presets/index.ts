import { CustomAccountPreset } from '@domain/models/custom-account-preset';
import { VEHICLE_PRESETS } from './vehicles';
import { HOME_UTILITIES_PRESETS } from './home-utilities';
import { SAVINGS_INVESTMENT_PRESETS } from './savings-investment';
import { HEALTH_PRESETS } from './health';
import { SUBSCRIPTIONS_PRESETS } from './subscriptions';
import { FAMILY_PRESETS } from './family';
import { PETS_PRESETS } from './pets';
import { TRAVEL_LEISURE_PRESETS } from './travel-leisure';
import { INSURANCE_PRESETS } from './insurance';
import { BUSINESS_PRESETS } from './business';
import { DEBT_PRESETS } from './debt';
import { HOBBIES_PRESETS } from './hobbies';
import { DONATIONS_GIFTS_PRESETS } from './donations-gifts';
import { PERSONAL_CARE_PRESETS } from './personal-care';
import { MISC_PRESETS } from './misc';

export const CUSTOM_ACCOUNT_PRESETS: readonly CustomAccountPreset[] = [
  ...VEHICLE_PRESETS,
  ...HOME_UTILITIES_PRESETS,
  ...SAVINGS_INVESTMENT_PRESETS,
  ...HEALTH_PRESETS,
  ...SUBSCRIPTIONS_PRESETS,
  ...FAMILY_PRESETS,
  ...PETS_PRESETS,
  ...TRAVEL_LEISURE_PRESETS,
  ...INSURANCE_PRESETS,
  ...BUSINESS_PRESETS,
  ...DEBT_PRESETS,
  ...HOBBIES_PRESETS,
  ...DONATIONS_GIFTS_PRESETS,
  ...PERSONAL_CARE_PRESETS,
  ...MISC_PRESETS
];
