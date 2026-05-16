import { describe, it, expect } from 'vitest';
import { formatFeatureCount } from './formatFeatureCount';

describe('formatFeatureCount', () => {
  it('singular', () => {
    expect(formatFeatureCount(1)).toBe('1 feature');
  });
  it('plural', () => {
    expect(formatFeatureCount(0)).toBe('0 features');
    expect(formatFeatureCount(12)).toBe('12 features');
  });
});
