import FirebaseAnalytics
import FirebaseFunctions

/// The closed set of UI "feature tap" signals the admin console tracks —
/// mirrors `functions/src/lib/featureTaps.ts`'s `FEATURE_TAP_KEYS` exactly;
/// keep the two in sync. Not free-text: an open string would let a typo or a
/// rename silently split one feature's count in two, invisibly.
enum FeatureTap: String {
    case createLesson = "create_lesson"
    case uploadVideo = "upload_video"
    case shareToSocial = "share_to_social"
    case openDeveloperApi = "open_developer_api"
    case createApiKey = "create_api_key"
    case openBilling = "open_billing"
    case topUp = "top_up"
    case subscribe = "subscribe"

    var displayName: String {
        switch self {
        case .createLesson: return "Create lesson"
        case .uploadVideo: return "Upload video"
        case .shareToSocial: return "Share to Social"
        case .openDeveloperApi: return "Open Developer API"
        case .createApiKey: return "Create API key"
        case .openBilling: return "Open Balance & plan"
        case .topUp: return "Top up"
        case .subscribe: return "Subscribe / switch plan"
        }
    }

    /// Falls back to a humanized version of the raw key for a feature the
    /// server knows about but this build doesn't yet — the admin report
    /// should never blank out a row just because the app is a version or two
    /// behind the backend's whitelist.
    static func displayName(forRawValue raw: String) -> String {
        FeatureTap(rawValue: raw)?.displayName ?? raw.split(separator: "_").map { $0.capitalized }.joined(separator: " ")
    }
}

/// The one place outside `FirebaseBootstrap.swift` allowed to import
/// FirebaseAnalytics, so the rest of the app can log events without
/// importing Firebase itself.
///
/// A small, deliberate event set — enough to answer "are people learning?",
/// not a firehose (`prompts/phase-03-discovery-social.md` §8). No PII in any
/// parameter — ids only, never names/emails/handles.
enum AppAnalytics {
    /// "Which UI features do people actually press" (phase-08 admin
    /// analytics) — logged to Firebase Analytics for Firebase's own
    /// dashboard *and* forwarded to `recordFeatureTap` so it also shows up
    /// in our in-app admin console, which can't reach Firebase Analytics
    /// data without a paid BigQuery export. Fire-and-forget: never awaited
    /// by the caller, never surfaces an error — a missed tap count isn't
    /// worth interrupting anything for.
    static func logFeatureTap(_ feature: FeatureTap, functions: Functions = FirebaseBootstrap.functions) {
        Analytics.logEvent("feature_tap", parameters: ["feature": feature.rawValue])
        Task {
            _ = try? await functions.httpsCallable("recordFeatureTap").call(["feature": feature.rawValue])
        }
    }

    static func logVideoLoadFailed(videoId: String) {
        Analytics.logEvent("video_load_failed", parameters: ["video_id": videoId])
    }

    static func logVideoStarted(videoId: String, topicId: String, categoryId: String) {
        Analytics.logEvent("video_started", parameters: [
            "video_id": videoId, "topic_id": topicId, "category_id": categoryId,
        ])
    }

    static func logVideoCompleted(videoId: String, topicId: String, categoryId: String) {
        Analytics.logEvent("video_completed", parameters: [
            "video_id": videoId, "topic_id": topicId, "category_id": categoryId,
        ])
    }

    static func logQuizSubmitted(videoId: String, score: Double, passed: Bool) {
        Analytics.logEvent("quiz_submitted", parameters: [
            "video_id": videoId, "score": score, "passed": passed,
        ])
    }

    static func logQuizSkipped(videoId: String) {
        Analytics.logEvent("quiz_skipped", parameters: ["video_id": videoId])
    }

    static func logTopicStarted(topicId: String, categoryId: String) {
        Analytics.logEvent("topic_started", parameters: ["topic_id": topicId, "category_id": categoryId])
    }

    static func logInterestsSelected(count: Int) {
        Analytics.logEvent("interest_selected", parameters: ["count": count])
    }

    static func logSignInCompleted(method: String) {
        Analytics.logEvent("sign_in_completed", parameters: ["method": method])
    }

    static func logCommentPosted(videoId: String, isReply: Bool) {
        Analytics.logEvent("comment_posted", parameters: ["video_id": videoId, "is_reply": isReply])
    }

    static func logAIOpened(videoId: String) {
        Analytics.logEvent("ai_opened", parameters: ["video_id": videoId])
    }
}
