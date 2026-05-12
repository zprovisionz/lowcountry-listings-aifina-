import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { matchNeighborhoodFromRows } from './detectNeighborhood';

const __dirname = dirname(fileURLToPath(import.meta.url));
const neighborhoods = (
  JSON.parse(readFileSync(join(__dirname, '../../public/charleston_neighborhoods.json'), 'utf8')) as {
    neighborhoods: Array<{ name: string; aliases?: string[] }>;
  }
).neighborhoods;

describe('detectNeighborhood (charleston_neighborhoods.json)', () => {
  it('detects Mount Pleasant from Old Village / Mt Pleasant', () => {
    expect(matchNeighborhoodFromRows('1234 Old Village Rd, Mt. Pleasant', neighborhoods)).toBe('Mount Pleasant');
  });

  it('detects Mount Pleasant from Rifle Range Rd', () => {
    expect(matchNeighborhoodFromRows('2020 Rifle Range Rd, Mount Pleasant', neighborhoods)).toBe('Mount Pleasant');
  });

  it('detects Folly Beach from Center St', () => {
    expect(matchNeighborhoodFromRows('123 Center St, Folly Beach', neighborhoods)).toBe('Folly Beach');
  });

  it('detects Goose Creek from Crowfield Blvd', () => {
    expect(matchNeighborhoodFromRows('456 Crowfield Blvd', neighborhoods)).toBe('Goose Creek');
  });
});
