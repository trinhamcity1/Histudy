import { onCall } from "firebase-functions/v2/https";
import { requireRole } from "../lib/auth";
import { db } from "../lib/admin";
import { computeDailyUsageStats, dateKey, DailyUsageStats } from "../lib/dailyUsageStats";

export interface AdminGetUsageStatsResult {
  today: DailyUsageStats;
  history: DailyUsageStats[];
}

/**
 * Admin-only read for the analytics console (prompts/phase-08-admin-analytics.md).
 * `today` is computed live (isPartial: true) — the same core function the
 * nightly aggregateDailyUsageStats trigger uses, just pointed at the current,
 * still-open day. `history` is whatever's already been finalized and
 * persisted to adminAnalytics/{date}, most recent first, for the trend
 * charts — never recomputed on read.
 */
export const adminGetUsageStats = onCall(async (request) => {
  requireRole(request, ["admin"]);

  const todayKey = dateKey(new Date());
  const [today, historySnap] = await Promise.all([
    computeDailyUsageStats({ dateKeyValue: todayKey, isPartial: true }),
    db.collection("adminAnalytics").orderBy("date", "desc").limit(30).get(),
  ]);

  return {
    today,
    history: historySnap.docs.map((doc) => doc.data() as DailyUsageStats),
  };
});
