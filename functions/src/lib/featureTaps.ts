/**
 * The closed set of UI "feature tap" signals the admin console tracks —
 * mirrors the iOS `FeatureTap` enum exactly (`Data/AppAnalytics.swift`); keep
 * the two in sync. Deliberately not free-text: an open string field would
 * let a typo or a rename silently split one feature's count in two, with no
 * way to notice from the aggregate numbers alone.
 */
export const FEATURE_TAP_KEYS = [
  "create_lesson",
  "upload_video",
  "share_to_social",
  "open_developer_api",
  "create_api_key",
  "open_billing",
  "top_up",
  "subscribe",
] as const;

export type FeatureTapKey = (typeof FEATURE_TAP_KEYS)[number];

export function isFeatureTapKey(value: unknown): value is FeatureTapKey {
  return typeof value === "string" && (FEATURE_TAP_KEYS as readonly string[]).includes(value);
}
