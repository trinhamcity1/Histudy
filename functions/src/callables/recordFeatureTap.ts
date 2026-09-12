import { onCall } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";
import { requireAuth } from "../lib/auth";
import { parseInput } from "../lib/validate";
import { RecordFeatureTapInputSchema } from "../schemas/callableInputs";
import { db } from "../lib/admin";
import { dateKey } from "../lib/dailyUsageStats";

/**
 * "Which UI features do people actually press" — a free complement to
 * Firebase Analytics (the client logs the same tap there too, for Firebase's
 * own dashboard). Firebase Analytics data isn't reachable from a Cloud
 * Function without a paid BigQuery export, so this is the path that gets a
 * tap into our own admin console instead.
 *
 * `requireAuth`, not `requireNotGuest` — a guest tapping "Create lesson"
 * before ever signing up *is* part of the signal worth seeing.
 *
 * One doc per UTC day, a map of feature -> count (`featureTaps/{date}`)
 * rather than an append-only event log: at this app's current traffic, a
 * single doc read gives computeDailyUsageStats the whole day's breakdown
 * with no query, no index, and nothing to drain or clean up later. Revisit
 * if a single feature's tap volume ever approaches Firestore's per-document
 * write-rate limit (a sustained ~1 write/sec) — the event-log + scheduled
 * drain shape `flushViewCounts` already uses is the fallback for that.
 */
export const recordFeatureTap = onCall(async (request) => {
  requireAuth(request);
  const input = parseInput(RecordFeatureTapInputSchema, request.data);
  const today = dateKey(new Date());
  await db
    .collection("featureTaps")
    .doc(today)
    .set({ date: today, [`counts.${input.feature}`]: FieldValue.increment(1) }, { merge: true });
  return { recorded: true };
});
