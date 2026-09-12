import Charts
import SwiftUI

/// Admin-only usage dashboard (phase-08 admin analytics). Every number here
/// comes straight from the `adminGetUsageStats` callable — this view never
/// aggregates anything itself, it only renders what the server already
/// computed. Reached from Admin home, same gating as every other screen
/// there (environment.isAdmin hides the entry point; requireRole enforces it
/// server-side regardless).
struct AdminAnalyticsView: View {
    let environment: AppEnvironment
    @Environment(\.theme) private var theme
    @State private var page: DailyUsageStatsPage?
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var selectedMetric: TrendMetric = .newSignups

    enum TrendMetric: String, CaseIterable, Identifiable {
        case newSignups = "Signups"
        case activeUsers = "Active"
        case lessonsGenerated = "Lessons"
        case aiTutorMessages = "AI msgs"
        var id: String { rawValue }
    }

    var body: some View {
        List {
            if let errorMessage {
                Section { Text(errorMessage).font(.subheadline).foregroundStyle(theme.error) }
            }

            if let page {
                Section("Today so far") {
                    statGrid([
                        ("New signups", "\(page.today.newSignups)"),
                        ("Active users", "\(page.today.activeUsers)"),
                        ("Quiz attempts", "\(page.today.quizAttemptsApprox)"),
                        ("AI tutor messages", "\(page.today.aiTutorMessages)"),
                    ])
                }

                Section("Lessons generated") {
                    statGrid([
                        ("Total", "\(page.today.lessonsGenerated)"),
                        ("Ready", "\(page.today.lessonsReady)"),
                        ("Failed", "\(page.today.lessonsFailed)"),
                    ])
                    ForEach(page.today.tierBreakdown(page.today.lessonsByTier), id: \.tier.rawValue) { row in
                        tierRow(row.tier, "\(row.count) lessons")
                    }
                }

                Section("Revenue today") {
                    statGrid([
                        ("Top-ups", currency(page.today.topUpRevenueCents)),
                        ("Subscriptions", currency(page.today.subscriptionRevenueCents)),
                        ("Total", currency(page.today.totalRevenueCents)),
                    ])
                    ForEach(page.today.tierBreakdown(page.today.subscriptionGrantsByTier), id: \.tier.rawValue) { row in
                        tierRow(row.tier, currency(row.count))
                    }
                }

                Section {
                    communityRow("Views", cumulative: page.today.cumulativeViews, today: page.today.viewsToday)
                    communityRow("Likes", cumulative: page.today.cumulativeLikes, today: page.today.likesToday)
                    communityRow("Comments", cumulative: page.today.cumulativeComments, today: page.today.commentsToday)
                    communityRow("API requests", cumulative: page.today.cumulativeApiRequests, today: page.today.apiRequestsToday)
                } header: {
                    Text("Community (cumulative / today)")
                } footer: {
                    Text("\"Today\" reads \"—\" the first day this ever runs, or after a gap in history — there's no prior snapshot yet to diff against.")
                }

                if !page.today.topCategories.isEmpty {
                    Section("Top categories today") {
                        ForEach(page.today.topCategories) { row in
                            HStack {
                                Text(displayCategory(row.categoryId)).foregroundStyle(theme.textPrimary)
                                Spacer()
                                Text("\(row.count)").foregroundStyle(theme.textSecondary)
                            }
                        }
                    }
                }

                if !page.today.topFeatureTaps.isEmpty {
                    Section {
                        ForEach(page.today.topFeatureTaps) { row in
                            HStack {
                                Text(FeatureTap.displayName(forRawValue: row.feature)).foregroundStyle(theme.textPrimary)
                                Spacer()
                                Text("\(row.count)").foregroundStyle(theme.textSecondary)
                            }
                        }
                    } header: {
                        Text("Top features tapped today")
                    } footer: {
                        Text("\(page.today.featureTapsTotal) taps total today across a fixed set of tracked buttons.")
                    }
                }

                if !page.history.isEmpty {
                    Section("Trend") {
                        Picker("Metric", selection: $selectedMetric) {
                            ForEach(TrendMetric.allCases) { Text($0.rawValue).tag($0) }
                        }
                        .pickerStyle(.segmented)
                        trendChart
                            .frame(height: 200)
                            .padding(.top, 8)
                    }
                } else {
                    Section {
                        Text("Trend history starts filling in after the first nightly aggregation run.")
                            .font(.caption)
                            .foregroundStyle(theme.textTertiary)
                    }
                }

                Section {
                    Text("Computed \(page.today.computedAt.formatted(date: .omitted, time: .shortened)) · UTC day \(page.today.date)")
                        .font(.caption2)
                        .foregroundStyle(theme.textTertiary)
                }
            } else if isLoading {
                Section {
                    HStack {
                        Spacer()
                        ProgressView()
                        Spacer()
                    }
                }
            }
        }
        .navigationTitle("Analytics")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task { await load() }
    }

    // MARK: - Sections

    private func statGrid(_ items: [(String, String)]) -> some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            ForEach(items, id: \.0) { label, value in
                VStack(alignment: .leading, spacing: 2) {
                    Text(value)
                        .font(.title3.weight(.semibold).monospacedDigit())
                        .foregroundStyle(theme.textPrimary)
                    Text(label)
                        .font(.caption)
                        .foregroundStyle(theme.textSecondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .padding(.vertical, 4)
    }

    private func tierRow(_ tier: Wallet.Tier, _ value: String) -> some View {
        HStack {
            Text(TierInfo.info(for: tier).displayName).foregroundStyle(theme.textSecondary)
            Spacer()
            Text(value).foregroundStyle(theme.textPrimary)
        }
        .font(.subheadline)
    }

    private func communityRow(_ label: String, cumulative: Int, today: Int?) -> some View {
        HStack {
            Text(label).foregroundStyle(theme.textPrimary)
            Spacer()
            Text("\(cumulative)").foregroundStyle(theme.textSecondary)
            Text("/").foregroundStyle(theme.textTertiary)
            Text(today.map { "+\($0)" } ?? "—")
                .foregroundStyle(theme.success)
        }
        .font(.subheadline.monospacedDigit())
    }

    private var trendChart: some View {
        Chart(trendPoints) { point in
            LineMark(x: .value("Date", point.shortDate), y: .value(selectedMetric.rawValue, point.value))
                .foregroundStyle(theme.accent)
                .interpolationMethod(.catmullRom)
            if point.isPartial {
                PointMark(x: .value("Date", point.shortDate), y: .value(selectedMetric.rawValue, point.value))
                    .foregroundStyle(theme.accent)
                    .symbolSize(70)
            }
        }
    }

    private struct TrendPoint: Identifiable {
        let date: String
        let value: Int
        let isPartial: Bool
        var id: String { date }
        /// "MM-DD" — the year is redundant at a 30-day trend window.
        var shortDate: String { String(date.dropFirst(5)) }
    }

    private var trendPoints: [TrendPoint] {
        guard let page else { return [] }
        let historyAscending = page.history.sorted { $0.date < $1.date }
        return (historyAscending + [page.today]).map {
            TrendPoint(date: $0.date, value: metricValue(selectedMetric, from: $0), isPartial: $0.isPartial)
        }
    }

    private func metricValue(_ metric: TrendMetric, from stats: DailyUsageStats) -> Int {
        switch metric {
        case .newSignups: return stats.newSignups
        case .activeUsers: return stats.activeUsers
        case .lessonsGenerated: return stats.lessonsGenerated
        case .aiTutorMessages: return stats.aiTutorMessages
        }
    }

    private func displayCategory(_ slug: String) -> String {
        slug.split(separator: "-").map { $0.capitalized }.joined(separator: " ")
    }

    private func currency(_ cents: Int) -> String {
        (Double(cents) / 100).formatted(.currency(code: "USD"))
    }

    private func load() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }
        do {
            page = try await environment.admin.usageStats()
        } catch {
            errorMessage = "Couldn't load usage stats. Pull to refresh."
        }
    }
}
