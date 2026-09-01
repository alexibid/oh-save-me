import { Customization } from '@domain/models/customization';

export interface CustomizationRepository {
  getAll(): Promise<readonly Customization[]>;
  save(customization: Customization): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}
