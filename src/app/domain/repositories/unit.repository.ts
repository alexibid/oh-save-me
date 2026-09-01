import { Unit } from '@domain/models/unit';

export interface UnitRepository {
  getAll(): Promise<readonly Unit[]>;
  save(unit: Readonly<Unit>): Promise<void>;
  delete(code: string): Promise<void>;
}
