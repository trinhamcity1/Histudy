import Foundation

/// Mirrors `functions/src/lib/dailyUsageStats.ts`'s `DailyUsageStats` —
/// returned by the `adminGetUsageStats` callable, never read directly from
/// Firestore (see `adminAnalytics/{date}`'s deny-all rule). `isPartial: true`
/// marks the live "today so far" figure the callable always includes
/// alongside whatever history has already been finalized by the nightly
/// aggregation job.
struct DailyUsageStats: Codable, Identifiable, Hashable {
    struct CategoryCount: Codable, Identifiable, Hashable {
        var categoryId: String
        var count: Int
        var id: String { categoryId }
    }

    var date: String
    var isPartial: Bool
    var computedAt: Date
    var newSignups: Int
    var activeUsers: Int
    var lessonsGenerated: Int
    var lessonsReady: Int
    var lessonsFailed: Int
    var lessonsByTier: [String: Int]
    var topCategories: [CategoryCount]
    var quizAttemptsApprox: Int
    var aiTutorMessages: Int
    var aiTutorMessagesByModel: [String: Int]
    var topUpRevenueCents: Int
    var subscriptionRevenueCents: Int
    var subscriptionGrantsByTier: [String: Int]
    var cumulativeViews: Int
    var cumulativeLikes: Int
    var cumulativeComments: Int
    var cumulativeApiRequests: Int
    /// nil when there's no prior-day snapshot to diff against yet — render
    /// as "—", never as 0 (see `diffCumulative`'s own doc comment).
    var viewsToday: Int?
    var likesToday: Int?
    var commentsToday: Int?
    var apiRequestsToday: Int?

    var id: String { date }

    var totalRevenueCents: Int { topUpRevenueCents + subscriptionRevenueCents }

    /// Display-friendly tier breakdown, sorted by the underlying `Wallet.Tier`
    /// order (Free → Pyramidion) rather than dictionary/insertion order.
    func tierBreakdown(_ byTier: [String: Int]) -> [(tier: Wallet.Tier, count: Int)] {
        Wallet.Tier.allCases.compactMap { tier in
            guard let count = byTier[tier.rawValue], count != 0 else { return nil }
            return (tier, count)
        }
    }
}
