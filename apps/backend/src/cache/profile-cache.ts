import { readJsonCache, writeJsonCache, invalidateTag } from './cache-utils';

const PROFILE_SUMMARY_TTL = parseInt(process.env.CACHE_PROFILE_TTL ?? '60', 10);
const PROFILE_SUMMARY_FULL_TTL = parseInt(process.env.CACHE_PROFILE_FULL_TTL ?? '120', 10);

const metricPrefix = 'profile.summary';

const profileSummaryKey = (userId: string, includeFullHistory: boolean) =>
  `cache:profile:${userId}:summary:${includeFullHistory ? 'full' : 'recent'}`;

const profileTag = (userId: string) => `cache:profile:${userId}:keys`;

export async function getProfileSummaryFromCache<T>(
  userId: string,
  includeFullHistory: boolean,
): Promise<T | null> {
  return readJsonCache<T>(profileSummaryKey(userId, includeFullHistory), metricPrefix);
}

export async function setProfileSummaryCache(
  userId: string,
  includeFullHistory: boolean,
  payload: unknown,
): Promise<void> {
  const ttl = includeFullHistory ? PROFILE_SUMMARY_FULL_TTL : PROFILE_SUMMARY_TTL;

  await writeJsonCache(profileSummaryKey(userId, includeFullHistory), payload, {
    ttlSeconds: ttl,
    tags: [profileTag(userId)],
    metricPrefix,
  });
}

export async function invalidateProfileSummary(userId: string): Promise<void> {
  await invalidateTag(profileTag(userId), metricPrefix).catch(() => undefined);
}

export async function invalidateProfileSummaries(userIds: string[]): Promise<void> {
  await Promise.all(userIds.map((id) => invalidateProfileSummary(id)));
}




