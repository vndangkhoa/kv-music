import SwiftUI

public struct LibraryView: View {
    @ObservedObject var db = MusicDatabase.shared
    @ObservedObject var player = PlayerManager.shared

    @State private var selectedFilter: LibraryFilter = .liked

    public enum LibraryFilter: String, CaseIterable, Identifiable {
        case liked = "Liked Tracks"
        case history = "History"
        case downloads = "Downloads"
        case artists = "Artists"

        public var id: String { rawValue }
        public var icon: String {
            switch self {
            case .liked: return "heart.fill"
            case .history: return "clock.fill"
            case .downloads: return "arrow.down.circle.fill"
            case .artists: return "person.2.fill"
            }
        }
    }

    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                Theme.backgroundDark
                    .ignoresSafeArea()

                VStack(spacing: 16) {
                    // Header
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text("YOUR COLLECTION")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(Theme.soundCloudOrange)
                                .tracking(1.0)
                            Text("Library")
                                .font(.system(size: 26, weight: .heavy))
                                .foregroundColor(Theme.textPrimary)
                        }

                        Spacer()

                        if selectedFilter == .history && !db.historyTracks.isEmpty {
                            Button("Clear") {
                                db.clearHistory()
                            }
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(Theme.soundCloudOrange)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)

                    // 4 Quick Filter Tiles
                    tilesGrid
                        .padding(.horizontal, 16)

                    // Selected Section List
                    contentListView
                }
            }
            .navigationBarHidden(true)
        }
    }

    // MARK: - Filter Tiles Grid
    private var tilesGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
            filterTile(filter: .liked, count: db.likedTracks.count)
            filterTile(filter: .history, count: db.historyTracks.count)
            filterTile(filter: .downloads, count: db.downloadedTracks.count)
            filterTile(filter: .artists, count: db.followedArtists.count)
        }
    }

    private func filterTile(filter: LibraryFilter, count: Int) -> some View {
        let isSelected = selectedFilter == filter

        return Button {
            withAnimation(.easeInOut(duration: 0.2)) {
                selectedFilter = filter
            }
        } label: {
            HStack(spacing: 12) {
                ZStack {
                    Circle()
                        .fill(isSelected ? Theme.soundCloudOrange.opacity(0.2) : Theme.cardSurface)
                        .frame(width: 38, height: 38)
                    Image(systemName: filter.icon)
                        .font(.system(size: 16))
                        .foregroundColor(isSelected ? Theme.soundCloudOrange : Theme.textSecondary)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(filter.rawValue)
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(isSelected ? Theme.textPrimary : Theme.textSecondary)

                    Text("\(count) \(filter == .artists ? "artists" : "tracks")")
                        .font(.system(size: 11))
                        .foregroundColor(Theme.textTertiary)
                }

                Spacer()
            }
            .padding(10)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? Theme.surfaceDark : Theme.cardSurface.opacity(0.5))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isSelected ? Theme.soundCloudOrange.opacity(0.8) : Theme.borderSubtle, lineWidth: 1)
                    )
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Content List
    private var contentListView: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(spacing: 10) {
                switch selectedFilter {
                case .liked:
                    if db.likedTracks.isEmpty {
                        emptyState(icon: "heart.slash", title: "No Liked Tracks Yet", subtitle: "Tap the heart on any track to add it to your favorites")
                    } else {
                        ForEach(db.likedTracks) { track in
                            trackRow(track: track, queue: db.likedTracks)
                        }
                    }

                case .history:
                    if db.historyTracks.isEmpty {
                        emptyState(icon: "clock.arrow.circlepath", title: "No Listening History", subtitle: "Tracks you listen to will show up here")
                    } else {
                        ForEach(db.historyTracks) { track in
                            trackRow(track: track, queue: db.historyTracks)
                        }
                    }

                case .downloads:
                    if db.downloadedTracks.isEmpty {
                        emptyState(icon: "arrow.down.circle", title: "No Downloaded Tracks", subtitle: "Save music for offline listening anywhere")
                    } else {
                        ForEach(db.downloadedTracks) { track in
                            trackRow(track: track, queue: db.downloadedTracks)
                        }
                    }

                case .artists:
                    if db.followedArtists.isEmpty {
                        emptyState(icon: "person.2.slash", title: "No Followed Artists", subtitle: "Follow artists from search or home to track their releases")
                    } else {
                        ForEach(Array(db.followedArtists).sorted(), id: \.self) { artistName in
                            artistRow(artistName: artistName)
                        }
                    }
                }

                Spacer(minLength: 80)
            }
            .padding(.horizontal, 16)
            .padding(.top, 4)
        }
    }

    // MARK: - Track Row
    private func trackRow(track: Track, queue: [Track]) -> some View {
        Button {
            player.play(track: track, newQueue: queue)
        } label: {
            HStack(spacing: 12) {
                AsyncImage(url: URL(string: track.artworkUrl)) { phase in
                    if case .success(let img) = phase {
                        img.resizable().scaledToFill()
                    } else {
                        Rectangle().fill(Theme.surfaceDark)
                    }
                }
                .frame(width: 48, height: 48)
                .clipShape(RoundedRectangle(cornerRadius: 8))

                VStack(alignment: .leading, spacing: 3) {
                    Text(track.title)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(Theme.textPrimary)
                        .lineLimit(1)

                    HStack(spacing: 6) {
                        Text(track.artist)
                            .font(.system(size: 12))
                            .foregroundColor(Theme.textSecondary)
                            .lineLimit(1)

                        Text("•")
                            .font(.system(size: 10))
                            .foregroundColor(Theme.textTertiary)

                        Text(formatDuration(track.duration))
                            .font(.system(size: 11, design: .monospaced))
                            .foregroundColor(Theme.textTertiary)
                    }
                }

                Spacer()

                Button {
                    db.toggleLike(track: track)
                } label: {
                    Image(systemName: db.isLiked(trackId: track.id) ? "heart.fill" : "heart")
                        .font(.system(size: 17))
                        .foregroundColor(db.isLiked(trackId: track.id) ? Theme.soundCloudOrange : Theme.textTertiary)
                        .frame(width: 32, height: 32)
                }
                .buttonStyle(.plain)
            }
            .padding(10)
            .background(Theme.surfaceDark.opacity(0.6))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Theme.borderSubtle, lineWidth: 0.5)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Artist Row
    private func artistRow(artistName: String) -> some View {
        HStack(spacing: 12) {
            ZStack {
                Circle().fill(Theme.surfaceDark)
                Image(systemName: "person.fill")
                    .foregroundColor(Theme.soundCloudOrange)
            }
            .frame(width: 44, height: 44)
            .overlay(Circle().stroke(Theme.borderSubtle, lineWidth: 1))

            Text(artistName)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Theme.textPrimary)

            Spacer()

            Button("Unfollow") {
                db.toggleFollow(artistName: artistName)
            }
            .font(.system(size: 12, weight: .medium))
            .foregroundColor(Theme.textSecondary)
            .padding(.horizontal, 12)
            .padding(.vertical, 5)
            .background(Theme.surfaceDark)
            .clipShape(Capsule())
            .overlay(Capsule().stroke(Theme.borderSubtle, lineWidth: 1))
        }
        .padding(10)
        .background(Theme.surfaceDark.opacity(0.6))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    // MARK: - Empty State
    private func emptyState(icon: String, title: String, subtitle: String) -> some View {
        VStack(spacing: 12) {
            Image(systemName: icon)
                .font(.system(size: 44))
                .foregroundColor(Theme.textTertiary)
            Text(title)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(Theme.textPrimary)
            Text(subtitle)
                .font(.system(size: 13))
                .foregroundColor(Theme.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 32)
        }
        .padding(.vertical, 50)
    }
}
