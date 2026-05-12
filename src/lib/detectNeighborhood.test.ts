import { describe, expect, it } from 'vitest';
import { detectNeighborhood } from './detectNeighborhood';

describe('detectNeighborhood', () => {
  it('detects Mount Pleasant', () => {
    expect(detectNeighborhood('123 Main St, Mount Pleasant, SC')).toBe('Mount Pleasant');
  });

  it('defaults to metro for unknown strings', () => {
    expect(detectNeighborhood('Somewhere unknown')).toBe('Charleston Metro');
  });
});
