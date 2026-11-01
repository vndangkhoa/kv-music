import SwiftUI

public struct SearchView: View {
    @ObservedObject var player = PlayerManager.shared
    @ObservedObject var db = MusicDatabase.shared

    @State private var query: String = ""
    @State private var selectedRegion: String = "US"
    @State private var selectedTab: SearchTab = .all
    @State private var isSearching: Bool = false
    @State private var suggestions: [String] = []
    @State private var tracks: [Track] = []
    @State private var albums: [AlbumHit] = []
    @State private var artists: [ArtistHit] = []
    @State private var playlists: [PlaylistHit] = []
    @State private var recentSearches: [String] = ["Lo-Fi Beats", "EDM 2024", "Phonk", "V-Pop", "Synthwave"]

    private let regions = ["US", "VN", "KR", "JP", "GB"]

    public enum SearchTab: String, CaseIterable, Identifiable {
        case all = "All"
        case tracks = "Tracks"
        case albums = "Albums"
        case artists = "Artists"
        case playlists = "Playlists"

        public var id: String { rawValue }
    }

    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                Theme.backgroundDark
                    .ignoresSafeArea()

                VStack(spacing: 0) {
                    // Search Bar & Region selector
                    searchHeaderView
                        .padding(.horizontal, 16)
                        .padding(.top, 12)
                        .padding(.bottom, 8)

                    // Region Selector Pills
                    regionSelectorView
                        .padding(.horizontal, 16)
                        .padding(.bottom, 12)

                    // Results or Recent/Suggestions
                    if query.isEmpty {
                        recentAndPopularView
                    } else if !suggestions.isEmpty && tracks.isEmpty && isSearching {
                        // Suggestions Dropdown
                        suggestionsListView
                    } else {
                        // Tabs & Results
                        tabsHeaderView
                        resultsContentView
                    }
                }
            }
            .navigationBarHidden(true)
        }
    }

    // MARK: - Search Header
    private var searchHeaderView: some View {
        HStack(spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundColor(Theme.soundCloudOrange)
                    .font(.system(size: 16, weight: .semibold))

                TextField("Artists, tracks, albums, playlists...", text: $query)
                    .foregroundColor(Theme.textPrimary)
                    .font(.system(size: 14))
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
                    .onChange(of: query) { newQuery in
                        Task { await handleQueryChanged(newQuery) }
                    }
                    .onSubmit {
                        executeSearch()
                    }

                if !query.isEmpty {
                    Button {
                        query = ""
                        suggestions = []
                        tracks = []
                        albums = []
                        artists = []
                        playlists = []
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundColor(Theme.textSecondary)
                            .font(.system(size: 16))
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Theme.surfaceDark)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Theme.borderSubtle, lineWidth: 1)
            )

            if !query.isEmpty {
                Button("Search") {
                    executeSearch()
                }
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(Theme.soundCloudOrange)
            }
        }
    }

    // MARK: - Region Selector
    private var regionSelectorView: some View {
        HStack(spacing: 8) {
            Text("REGION:")
                .font(.system(size: 11, weight: .bold))
                .foregroundColor(Theme.textTertiary)

            ForEach(regions, id: \.self) { reg in
                Button {
                    selectedRegion = reg
                    if !query.isEmpty {
                        executeSearch()
                    }
                } label: {
                    Text(reg)
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(selectedRegion == reg ? .black : Theme.textSecondary)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(
                            selectedRegion == reg
                                ? AnyShapeStyle(Theme.soundCloudOrange)
                                : AnyShapeStyle(Theme.surfaceDark)
                        )
                        .clipShape(Capsule())
                }
            }
            Spacer()
        }
    }

    // MARK: - Tabs Header
    private var tabsHeaderView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(SearchTab.allCases) { tab in
                    Button {
                        selectedTab = tab
                    } label: {
                        Text(tab.rawValue)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(selectedTab == tab ? .white : Theme.textSecondary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 6)
                            .background(selectedTab == tab ? Theme.cardSurface : Color.clear)
                            .clipShape(Capsule())
                            .overlay(
                                Capsule().stroke(selectedTab == tab ? Theme.soundCloudOrange : Color.clear, lineWidth: 1)
                            )
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 6)
        }
        .background(Theme.backgroundDark)
    }

    // MARK: - Recent & Popular
    private var recentAndPopularView: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 20) {
                if !recentSearches.isEmpty {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack {
                            Text("Recent Searches")
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(Theme.textPrimary)
                            Spacer()
                            Button("Clear") {
                                recentSearches.removeAll()
                            }
                            .font(.system(size: 12))
                            .foregroundColor(Theme.soundCloudOrange)
                        }

                        FlowLayout(spacing: 8) {
                            ForEach(recentSearches, id: \.self) { term in
                                Button {
                                    query = term
                                    executeSearch()
                                } label: {
                                    HStack(spacing: 6) {
                                        Image(systemName: "clock.arrow.circlepath")
                                            .font(.system(size: 11))
                                        Text(term)
                                            .font(.system(size: 13))
                                    }
                                    .foregroundColor(Theme.textSecondary)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(Theme.surfaceDark)
                                    .clipShape(Capsule())
                                    .overlay(Capsule().stroke(Theme.borderSubtle, lineWidth: 0.5))
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                }

                // Explore Genres
                VStack(alignment: .leading, spacing: 12) {
                    Text("Explore Categories")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(Theme.textPrimary)
                        .padding(.horizontal, 16)

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                        categoryCard(title: "Electronic & EDM", color: Color.orange)
                        categoryCard(title: "Hip-Hop & Rap", color: Color.purple)
                        categoryCard(title: "Chill & Lo-Fi", color: Color.blue)
                        categoryCard(title: "Rock & Metal", color: Color.red)
                        categoryCard(title: "Pop & Dance", color: Color.pink)
                        categoryCard(title: "Ambient & Beats", color: Color.teal)
                    }
                    .padding(.horizontal, 16)
                }

                Spacer(minLength: 80)
            }
            .padding(.top, 10)
        }
    }

    private func categoryCard(title: String, color: Color) -> some View {
        Button {
            query = title
            executeSearch()
        } label: {
            ZStack(alignment: .bottomLeading) {
                RoundedRectangle(cornerRadius: 12)
                    .fill(
                        LinearGradient(
                            colors: [color.opacity(0.8), color.opacity(0.3)],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .frame(height: 70)

                Text(title)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .padding(12)
            }
        }
        .buttonStyle(.plain)
    }

    // MARK: - Suggestions List
    private var suggestionsListView: some View {
        List {
            ForEach(suggestions, id: \.self) { sug in
                Button {
                    query = sug
                    executeSearch()
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "magnifyingglass")
                            .foregroundColor(Theme.textTertiary)
                            .font(.system(size: 14))
                        Text(sug)
                            .foregroundColor(Theme.textPrimary)
                            .font(.system(size: 15))
                        Spacer()
                        Image(systemName: "arrow.up.left")
                            .foregroundColor(Theme.textTertiary)
                            .font(.system(size: 12))
                    }
                    .padding(.vertical, 4)
                }
                .listRowBackground(Theme.backgroundDark)
            }
        }
        .listStyle(.plain)
        .scrollContentBackground(.hidden)
    }

    // MARK: - Results Content
    private var resultsContentView: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 16) {
                if isSearching {
                    HStack {
                        Spacer()
                        ProgressView().tint(Theme.soundCloudOrange)
                        Spacer()
                    }
                    .padding(.top, 30)
                } else if tracks.isEmpty && albums.isEmpty && artists.isEmpty {
                    VStack(spacing: 10) {
                        Image(systemName: "waveform.badge.exclamationmark")
                            .font(.system(size: 40))
                            .foregroundColor(Theme.textTertiary)
                        Text("No matching sounds found")
                            .font(.system(size: 15, weight: .semibold))
                            .foregroundColor(Theme.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.top, 40)
                } else {
                    // Tracks View
                    if selectedTab == .all || selectedTab == .tracks {
                        if !tracks.isEmpty {
                            VStack(alignment: .leading, spacing: 10) {
                                if selectedTab == .all {
                                    Text("Tracks")
                                        .font(.system(size: 17, weight: .bold))
                                        .foregroundColor(Theme.textPrimary)
                                        .padding(.horizontal, 16)
                                }

                                ForEach(tracks) { track in
                                    SoundCloudTrackCard(track: track) {
                                        player.play(track: track, newQueue: tracks)
                                    }
                                    .padding(.horizontal, 16)
                                }
                            }
                        }
                    }

                    // Albums View
                    if selectedTab == .all || selectedTab == .albums {
                        if !albums.isEmpty {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("Albums")
                                    .font(.system(size: 17, weight: .bold))
                                    .foregroundColor(Theme.textPrimary)
                                    .padding(.horizontal, 16)

                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 12) {
                                        ForEach(albums) { alb in
                                            albumCard(alb)
                                        }
                                    }
                                    .padding(.horizontal, 16)
                                }
                            }
                        }
                    }

                    // Artists View
                    if selectedTab == .all || selectedTab == .artists {
                        if !artists.isEmpty {
                            VStack(alignment: .leading, spacing: 10) {
                                Text("Artists")
                                    .font(.system(size: 17, weight: .bold))
                                    .foregroundColor(Theme.textPrimary)
                                    .padding(.horizontal, 16)

                                ForEach(artists) { art in
                                    artistRow(art)
                                        .padding(.horizontal, 16)
                                }
                            }
                        }
                    }
                }

                Spacer(minLength: 80)
            }
            .padding(.top, 8)
        }
    }

    private func albumCard(_ album: AlbumHit) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            AsyncImage(url: URL(string: album.artworkUrl ?? "")) { phase in
                if case .success(let img) = phase {
                    img.resizable().scaledToFill()
                } else {
                    Rectangle().fill(Theme.surfaceDark)
                }
            }
            .frame(width: 130, height: 130)
            .clipShape(RoundedRectangle(cornerRadius: 10))

            Text(album.title)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(Theme.textPrimary)
                .lineLimit(1)

            Text(album.artist)
                .font(.system(size: 11))
                .foregroundColor(Theme.textSecondary)
                .lineLimit(1)
        }
        .frame(width: 130)
    }

    private func artistRow(_ artist: ArtistHit) -> some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: artist.avatarUrl ?? "")) { phase in
                if case .success(let img) = phase {
                    img.resizable().scaledToFill()
                } else {
                    Circle().fill(Theme.surfaceDark)
                }
            }
            .frame(width: 48, height: 48)
            .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(artist.name)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(Theme.textPrimary)
                Text("Verified Creator")
                    .font(.system(size: 11))
                    .foregroundColor(Theme.soundCloudOrange)
            }

            Spacer()

            Button {
                db.toggleFollow(artistName: artist.name)
            } label: {
                Text(db.isFollowed(artistName: artist.name) ? "Following" : "Follow")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(db.isFollowed(artistName: artist.name) ? Theme.textPrimary : .black)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(
                        db.isFollowed(artistName: artist.name)
                            ? AnyShapeStyle(Theme.surfaceDark)
                            : AnyShapeStyle(Theme.accentGradient)
                    )
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .padding(10)
        .background(Theme.surfaceDark.opacity(0.6))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func handleQueryChanged(_ q: String) async {
        guard !q.isEmpty else {
            suggestions = []
            return
        }
        let sugs = await KVMusicApi.shared.fetchSuggestions(query: q)
        await MainActor.run {
            self.suggestions = sugs
        }
    }

    private func executeSearch() {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        if !recentSearches.contains(trimmed) {
            recentSearches.insert(trimmed, at: 0)
        }

        isSearching = true
        suggestions = []

        Task {
            let res = await KVMusicApi.shared.universalSearch(query: trimmed, region: selectedRegion)
            await MainActor.run {
                self.tracks = res.tracks
                self.albums = res.albums
                self.artists = res.artists
                self.playlists = res.playlists
                self.isSearching = false
            }
        }
    }
}

// FlowLayout helper for chips
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var currentX: CGFloat = 0
        var currentY: CGFloat = 0
        var lineHeight: CGFloat = 0

        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if currentX + size.width > width {
                currentX = 0
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            currentX += size.width + spacing
            lineHeight = max(lineHeight, size.height)
        }
        return CGSize(width: width, height: currentY + lineHeight)
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var currentX = bounds.minX
        var currentY = bounds.minY
        var lineHeight: CGFloat = 0

        for view in subviews {
            let size = view.sizeThatFits(.unspecified)
            if currentX + size.width > bounds.maxX {
                currentX = bounds.minX
                currentY += lineHeight + spacing
                lineHeight = 0
            }
            view.place(at: CGPoint(x: currentX, y: currentY), proposal: .unspecified)
            currentX += size.width + spacing
            lineHeight = max(lineHeight, size.height)
        }
    }
}
