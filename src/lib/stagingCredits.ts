import { STAGING_BATCH_MAX_BY_TIER } from '../config';
import type { Profile, Tier } from '../types/database';

type StagingNumbers = Pick<
  Profile,
  'staging_credits_used' | 'staging_credits_limit' | 'extra_staging_credits'
>;

/** Plan + purchased staging credits (not remaining). Infinity when unlimited. */
export function effectiveStagingCapacity(profile: StagingNumbers | null | undefined): number {
  if (!profile) return 0;
  if (profile.staging_credits_limit === -1) return Number.POSITIVE_INFINITY;
  return profile.staging_credits_limit + (profile.extra_staging_credits ?? 0);
}

export function remainingStagingCredits(profile: StagingNumbers | null | undefined): number {
  if (!profile) return 0;
  const cap = effectiveStagingCapacity(profile);
  if (cap === Number.POSITIVE_INFINITY) return Number.POSITIVE_INFINITY;
  return Math.max(0, cap - profile.staging_credits_used);
}

export function hasStagingQuotaForN(
  profile: StagingNumbers | null | undefined,
  n: number,
): boolean {
  if (n < 1) return false;
  const rem = remainingStagingCredits(profile);
  if (rem === Number.POSITIVE_INFINITY) return true;
  return rem >= n;
}

export function stagingBatchCapForTier(tier: Tier | string | null | undefined): number {
  const t = (tier ?? 'free') as Tier;
  return STAGING_BATCH_MAX_BY_TIER[t] ?? STAGING_BATCH_MAX_BY_TIER.free;
}

/** min(remaining, tier batch cap, photo count) for staging selection UI */
export function effectiveStagingSelectionCap(
  profile: StagingNumbers | null | undefined,
  tier: Tier | string | null | undefined,
  photoCount: number,
): number {
  if (photoCount < 1) return 0;
  const tierCap = stagingBatchCapForTier(tier);
  if (tierCap < 1) return 0;
  const rem = remainingStagingCredits(profile);
  if (rem === Number.POSITIVE_INFINITY) return Math.min(tierCap, photoCount);
  return Math.min(Math.floor(rem), tierCap, photoCount);
}

/** Max selectable photos for staging UI (tier cap + remaining credits; optional QA bypass for credits only). */
export function stagingSelectionCapForUi(
  profile: StagingNumbers | null | undefined,
  tier: Tier | string | null | undefined,
  photoCount: number,
  allowQuotaBypass: boolean,
): number {
  const tierCap = stagingBatchCapForTier(tier);
  if (tierCap < 1 || photoCount < 1) return 0;
  if (allowQuotaBypass) return Math.min(photoCount, tierCap);
  return effectiveStagingSelectionCap(profile, tier, photoCount);
}
