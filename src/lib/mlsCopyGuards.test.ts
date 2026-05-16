import { describe, it, expect } from 'vitest';
import {
  buildMlsFactCorpus,
  findUnsupportedInteriorClaims,
  countVoiceClichés,
} from './mlsCopyGuards';

const SAMPLE_MLS = `As you approach 1216 Penny Circle, the tranquil allure of Mount Pleasant wraps around you like a warm embrace.
Step inside, and you'll find a thoughtfully designed interior that unfolds over 1,400 square feet of inviting living space.
The heart of this home features a bright, open layout where natural light dances through expansive windows, illuminating the rich wood flooring.
This home offers three welcoming bedrooms. The master suite stands out as a serene oasis.`;

describe('mlsCopyGuards', () => {
  it('flags hardwood / open layout / windows / master suite when corpus is only Screened Piazza', () => {
    const corpus = buildMlsFactCorpus(['Screened Piazza'], '', '');
    const bad = findUnsupportedInteriorClaims(SAMPLE_MLS, corpus);
    expect(bad.length).toBeGreaterThanOrEqual(3);
    expect(bad.some((x) => x.includes('named flooring') || x.includes('flooring'))).toBe(true);
    expect(bad.some((x) => x.includes('open layout'))).toBe(true);
  });

  it('allows hardwood when amenity lists hardwood', () => {
    const corpus = buildMlsFactCorpus(['Hardwood Floors', 'Screened Piazza'], '', '');
    const bad = findUnsupportedInteriorClaims(
      'The rich hardwood flooring runs through the main level.',
      corpus,
    );
    expect(bad.filter((x) => x.includes('flooring'))).toHaveLength(0);
  });

  it('counts purple-prose phrases', () => {
    expect(countVoiceClichés(SAMPLE_MLS)).toBeGreaterThanOrEqual(2);
  });
});
