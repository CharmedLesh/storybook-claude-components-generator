import { describe, expect, it } from 'vitest';
import { AVAILABLE_MODELS, DEFAULT_MODEL, type ModelId } from '../models';

describe('AVAILABLE_MODELS', () => {
  it('contains at least one model', () => {
    expect(AVAILABLE_MODELS.length).toBeGreaterThan(0);
  });

  it('has unique ids', () => {
    const ids = AVAILABLE_MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(AVAILABLE_MODELS)('$id has required fields', (model) => {
    expect(model.id).toBeTruthy();
    expect(model.label).toBeTruthy();
    expect(model.description).toBeTruthy();
  });
});

describe('DEFAULT_MODEL', () => {
  it('is one of the available model ids', () => {
    const ids = AVAILABLE_MODELS.map((m) => m.id) as readonly string[];
    expect(ids).toContain(DEFAULT_MODEL satisfies ModelId);
  });
});
