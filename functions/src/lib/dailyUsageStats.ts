import { AggregateField, Timestamp } from "firebase-admin/firestore";
import { db } from "./admin";
import { TierId } from "./tiers";

/**
 * One day's worth of platform-usage numbers for the admin console
 * (prompts/phase-08-admin-analytics.md). A single shape serves two entry
 * points — see computeDailyUsageStats's own doc comment — distinguished by
 * `isPartial`: false for a nightly-finalized day, true for "today so far".
 */
export interface DailyUsageStats {
  /** UTC date key, "YYYY-MM-DD". */
  date: string;
  isPartial: boolean;
  computedAt: string;
  newSignups: number;
  /** Learners with a quiz attempt or a completed video today — see lastActiveAt's own write sites. */
  activeUsers: number;
  lessonsGenerated: number;
  lessonsReady: number;
  lessonsFailed: number;
  lessonsByTier: Partial<Record<TierId, number>>;
  topCategories: Array<{ categoryId: string; count: number }>;
  /** Distinct videoProgress docs touched today, not a true attempt count — see docstring below. */
  quizAttemptsApprox: number;
  aiTutorMessages: number;
  aiTutorMessagesByModel: Record<string, number>;
  topUpRevenueCents: number;
  subscriptionRevenueCents: number;
  subscriptionGrantsByTier: Partial<Record<TierId, number>>;
  cumulativeViews: number;
  cumulativeLikes: number;
  cumulativeComments: number;
  cumulativeApiRequests: number;
  /** null when there's no prior-day snapshot to diff against — render as "—", never as 0. */
  viewsToday: number | null;
  likesToday: number | null;
  commentsToday: number | null;
  apiRequestsToday: number | null;
}

export interface CumulativeSnapshot {
  views: number;
  likes: number;
  comments: number;
  apiRequests: number;
}

// ---- pure helpers, unit-tested directly in dailyUsageStats.test.ts --------

export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dayBoundsUtc(key: string): { start: Date; end: Date } {
  const start = new Date(`${key}T00:00:00.000Z`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

export function topCategoriesFromCounts(counts: Record<string, number>, n: number): Array<{ categoryId: string; count: number }> {
  return Object.entries(counts)
    .map(([categoryId, count]) => ({ categoryId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

/**
 * The "today" delta for a cumulative counter (views/likes/comments/API
 * requests) that's never queryable directly for a past day — flushViewCounts
 * deletes viewEvents once it's drained them into videos.viewCount hourly, so
 * there is no event log left to query "how many views happened yesterday".
 * Diffing today's total against yesterday's stored total is the only way.
 *
 * Clamped at 0, never negative: a cumulative total can legitimately drop
 * between two snapshots (a video with likes/views gets deleted), and a
 * negative "today" figure would be more confusing to an admin than a floor
 * of zero.
 */
export function diffCumulative(current: number, previous: number | null): number | null {
  if (previous == null) return null;
  return Math.max(0, current - previous);
}

// ---- Firestore-querying core -----------------------------------------------

/** Sums straight off the live documents — no filter, so no index is needed; Firestore computes it server-side without downloading rows. */
export async function readCumulativeSnapshot(): Promise<CumulativeSnapshot> {
  const [videoAgg, apiKeyAgg] = await Promise.all([
    db
      .collection("videos")
      .aggregate({
        views: AggregateField.sum("viewCount"),
        likes: AggregateField.sum("likeCount"),
        comments: AggregateField.sum("commentCount"),
      })
      .get(),
    db
      .collection("apiKeys")
      .aggregate({ requests: AggregateField.sum("requestCount") })
      .get(),
  ]);
  const v = videoAgg.data();
  const k = apiKeyAgg.data();
  return { views: v.views, likes: v.likes, comments: v.comments, apiRequests: k.requests };
}

/** null when `previousDateKey` was never finalized (first run, or a gap in adminAnalytics history). */
export async function readPreviousCumulative(previousDateKey: string): Promise<CumulativeSnapshot | null> {
  const snap = await db.collection("adminAnalytics").doc(previousDateKey).get();
  if (!snap.exists) return null;
  const data = snap.data() as DailyUsageStats;
  return {
    views: data.cumulativeViews,
    likes: data.cumulativeLikes,
    comments: data.cumulativeComments,
    apiRequests: data.cumulativeApiRequests,
  };
}

/**
 * The one implementation behind both entry points — same "one implementation,
 * two callers" shape as runCreateOnDemandLesson/lessonsApi. The nightly
 * scheduled trigger (aggregateDailyUsageStats.ts) calls this for a finalized
 * past day (isPartial: false) and persists the result; the admin-only
 * callable (adminGetUsageStats.ts) calls it for "today so far"
 * (isPartial: true) and returns it live, without persisting anything.
 *
 * Every read here is bounded: either a single day's worth of documents
 * (on-demand lessons, AI tutor messages, credit-ledger rows created that
 * day) or a collection-wide sum aggregate that Firestore computes
 * server-side without downloading rows — safe to run inside an onCall
 * handler's request/response window, not just a background job.
 */
export async function computeDailyUsageStats(params: { dateKeyValue: string; isPartial: boolean }): Promise<DailyUsageStats> {
  const { dateKeyValue, isPartial } = params;
  const { start, end } = dayBoundsUtc(dateKeyValue);
  const startTs = Timestamp.fromDate(start);
  const endTs = Timestamp.fromDate(end);
  const previousKey = dateKey(new Date(start.getTime() - 24 * 60 * 60 * 1000));

  const [
    newSignupsAgg,
    activeUsersAgg,
    onDemandVideosSnap,
    quizAttemptsAgg,
    aiMessagesUserAgg,
    aiMessagesAssistantSnap,
    topUpAgg,
    subscriptionGrantSnap,
    cumulative,
    previousCumulative,
  ] = await Promise.all([
    db.collection("users").where("createdAt", ">=", startTs).where("createdAt", "<", endTs).count().get(),
    db.collection("users").where("lastActiveAt", ">=", startTs).where("lastActiveAt", "<", endTs).count().get(),
    db
      .collection("videos")
      .where("generationSource", "==", "on_demand")
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<", endTs)
      .get(),
    db.collectionGroup("videoProgress").where("lastAnsweredAt", ">=", startTs).where("lastAnsweredAt", "<", endTs).count().get(),
    db
      .collectionGroup("messages")
      .where("role", "==", "user")
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<", endTs)
      .count()
      .get(),
    db
      .collectionGroup("messages")
      .where("role", "==", "assistant")
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<", endTs)
      .get(),
    db
      .collectionGroup("creditTransactions")
      .where("type", "==", "topup")
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<", endTs)
      .aggregate({ total: AggregateField.sum("amountCents") })
      .get(),
    db
      .collectionGroup("creditTransactions")
      .where("type", "==", "subscription_grant")
      .where("createdAt", ">=", startTs)
      .where("createdAt", "<", endTs)
      .get(),
    readCumulativeSnapshot(),
    readPreviousCumulative(previousKey),
  ]);

  const lessonsByTier: Partial<Record<TierId, number>> = {};
  const categoryCounts: Record<string, number> = {};
  let lessonsReady = 0;
  let lessonsFailed = 0;
  for (const doc of onDemandVideosSnap.docs) {
    const data = doc.data();
    const tier = data.tierAtGeneration as TierId | undefined;
    if (tier) lessonsByTier[tier] = (lessonsByTier[tier] ?? 0) + 1;
    const categoryId = data.categoryId as string | undefined;
    if (categoryId) categoryCounts[categoryId] = (categoryCounts[categoryId] ?? 0) + 1;
    if (data.status === "ready") lessonsReady++;
    if (data.status === "failed") lessonsFailed++;
  }

  const aiTutorMessagesByModel: Record<string, number> = {};
  for (const doc of aiMessagesAssistantSnap.docs) {
    const model = (doc.data().model as string | undefined) ?? "unknown";
    aiTutorMessagesByModel[model] = (aiTutorMessagesByModel[model] ?? 0) + 1;
  }

  const subscriptionGrantsByTier: Partial<Record<TierId, number>> = {};
  let subscriptionRevenueCents = 0;
  for (const doc of subscriptionGrantSnap.docs) {
    const data = doc.data();
    const amount = (data.amountCents as number | undefined) ?? 0;
    subscriptionRevenueCents += amount;
    const tier = data.tier as TierId | undefined;
    if (tier) subscriptionGrantsByTier[tier] = (subscriptionGrantsByTier[tier] ?? 0) + amount;
  }

  return {
    date: dateKeyValue,
    isPartial,
    computedAt: new Date().toISOString(),
    newSignups: newSignupsAgg.data().count,
    activeUsers: activeUsersAgg.data().count,
    lessonsGenerated: onDemandVideosSnap.size,
    lessonsReady,
    lessonsFailed,
    lessonsByTier,
    topCategories: topCategoriesFromCounts(categoryCounts, 5),
    quizAttemptsApprox: quizAttemptsAgg.data().count,
    aiTutorMessages: aiMessagesUserAgg.data().count + aiMessagesAssistantSnap.size,
    aiTutorMessagesByModel,
    topUpRevenueCents: topUpAgg.data().total,
    subscriptionRevenueCents,
    subscriptionGrantsByTier,
    cumulativeViews: cumulative.views,
    cumulativeLikes: cumulative.likes,
    cumulativeComments: cumulative.comments,
    cumulativeApiRequests: cumulative.apiRequests,
    viewsToday: diffCumulative(cumulative.views, previousCumulative?.views ?? null),
    likesToday: diffCumulative(cumulative.likes, previousCumulative?.likes ?? null),
    commentsToday: diffCumulative(cumulative.comments, previousCumulative?.comments ?? null),
    apiRequestsToday: diffCumulative(cumulative.apiRequests, previousCumulative?.apiRequests ?? null),
  };
}
