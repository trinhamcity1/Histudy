import { onSchedule } from "firebase-functions/v2/scheduler";
import { db } from "../lib/admin";
import { computeDailyUsageStats, dateKey } from "../lib/dailyUsageStats";

/**
 * Finalizes yesterday's usage numbers once a day and persists them to
 * `adminAnalytics/{date}` — the durable history the admin console's trend
 * charts read, and the baseline every later day's "today" cumulative deltas
 * (views/likes/comments/API requests) diff against. Runs early UTC so
 * "yesterday" (UTC) is fully closed out by the time this fires.
 */
export const aggregateDailyUsageStats = onSchedule({ schedule: "0 1 * * *", timeZone: "UTC" }, async () => {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const key = dateKey(yesterday);
  const stats = await computeDailyUsageStats({ dateKeyValue: key, isPartial: false });
  await db.collection("adminAnalytics").doc(key).set(stats);
});
