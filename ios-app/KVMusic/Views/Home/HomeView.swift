import SwiftUI

public struct HomeView: View {
    @ObservedObject var player = PlayerManager.shared
    @ObservedObject var db = MusicDatabase.shared

    @State private var trendingTracks: [Track] = []
    @State private var topCharts: [Track] = []
    @State private var newReleases: [Track] = []
    @State private var featuredArtists: [ArtistHit] = []
    @State private var heroIndex: Int = 0
    @State private var isLoading: Bool = true
    @State private var selectedGenre: String = "All"

    private let genres = ["All", "Electronic", "Hip-Hop", "Dance", "Pop", "Rock", "R&B", "Ambient", "Indie"]
    private let timer = Timer.publish(every: 5, on: .main, in: .common).autoconnect()

    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                Theme.backgroundDark
                    .ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 24) {
                        // Header
                        headerView
                            .padding(.horizontal, 16)
                            .padding(.top, 12)

                        // Genre selector pills
                        genreFilterView

                        if isLoading && trendingTracks.isEmpty {
                            VStack(spacing: 16) {
                                Spacer(minLength: 60)
                                ProgressView()
                                    .tint(Theme.soundCloudOrange)
                                    .scaleEffect(1.3)
                                Text("Loading SoundCloud feeds...")
                                    .font(.system(size: 14))
                                    .foregroundColor(Theme.textSecondary)
                                Spacer(minLength: 60)
                            }
                            .frame(maxWidth: .infinity)
                        } else {
                            // Spotlight Hero Carousel
                            if !trendingTracks.isEmpty {
                                heroCarouselView
                            }

                            // Section 1: Trending on SoundCloud
                            VStack(alignment: .leading, spacing: 12) {
                                sectionHeader(title: "Trending on SoundCloud", subtitle: "Most streamed music right now")

                                ScrollView(.horizontal, showsIndicators: false) {
                                    LazyHStack(spacing: 14) {
                                        ForEach(trendingTracks) { track in
                                            SoundCloudTrackCard(track: track, cardWidth: 260) {
                                                player.play(track: track, newQueue: trendingTracks)
                                            }
                                        }
                                    }
                                    .padding(.horizontal, 16)
                                }
                            }

                            // Section 2: Top Charts
                            if !topCharts.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    sectionHeader(title: "Top 50 Charts", subtitle: "Global Top Hits")

                                    VStack(spacing: 8) {
                                        ForEach(Array(topCharts.prefix(8).enumerated()), id: \.element.id) { index, track in
                                            chartRow(rank: index + 1, track: track)
                                        }
                                    }
                                    .padding(.horizontal, 16)
                                }
                            }

                            // Section 3: New Releases
                            if !newReleases.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    sectionHeader(title: "Fresh Drops", subtitle: "Latest releases from verified artists")

                                    ScrollView(.horizontal, showsIndicators: false) {
                                        LazyHStack(spacing: 14) {
                                            ForEach(newReleases) { track in
                                                SoundCloudTrackCard(track: track, cardWidth: 220) {
                                                    player.play(track: track, newQueue: newReleases)
                                                }
                                            }
                                        }
                                        .padding(.horizontal, 16)
                                    }
                                }
                            }

                            // Section 4: Who to Follow
                            if !featuredArtists.isEmpty {
                                VStack(alignment: .leading, spacing: 12) {
                                    sectionHeader(title: "Who to Follow", subtitle: "Creators you might like")

                                    ScrollView(.horizontal, showsIndicators: false) {
                                        LazyHStack(spacing: 16) {
                                            ForEach(featuredArtists) { artist in
                                                artistCard(artist: artist)
                                            }
                                        }
                                        .padding(.horizontal, 16)
                                    }
                                }
                            }
                        }

                        // Bottom padding for mini player
                        Spacer().frame(height: 80)
                    }
                }
                .refreshable {
                    await loadHomeData()
                }
            }
            .navigationBarHidden(true)
        }
        .task {
            await loadHomeData()
        }
        .onReceive(timer) { _ in
            if !trendingTracks.isEmpty {
                withAnimation(.easeInOut(duration: 0.6)) {
                    heroIndex = (heroIndex + 1) % min(5, trendingTracks.count)
                }
            }
        }
    }

    // MARK: - Header
    private var headerView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text(greetingText())
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Theme.soundCloudOrange)
                    .textCase(.uppercase)
                    .tracking(1.0)

                Text("KV-Music")
                    .font(.system(size: 26, weight: .heavy))
                    .foregroundColor(Theme.textPrimary)
            }

            Spacer()

            ZStack {
                Circle()
                    .fill(Theme.surfaceDark)
                    .frame(width: 40, height: 40)
                    .overlay(Circle().stroke(Theme.borderSubtle, lineWidth: 1))

                Image(systemName: "waveform")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Theme.soundCloudOrange)
            }
        }
    }

    private func greetingText() -> String {
        let hour = Calendar.current.component(.hour, from: Date())
        if hour < 12 { return "Good Morning" }
        if hour < 18 { return "Good Afternoon" }
        return "Good Evening"
    }

    // MARK: - Genre Selector
    private var genreFilterView: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(genres, id: \.self) { genre in
                    Button {
                        selectedGenre = genre
                        Task { await filterByGenre(genre) }
                    } label: {
                        Text(genre)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(selectedGenre == genre ? .black : Theme.textSecondary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 7)
                            .background(
                                selectedGenre == genre
                                    ? AnyShapeStyle(Theme.accentGradient)
                                    : AnyShapeStyle(Theme.surfaceDark)
                            )
                            .clipShape(Capsule())
                            .overlay(
                                Capsule().stroke(selectedGenre == genre ? Color.clear : Theme.borderSubtle, lineWidth: 1)
                            )
                    }
                }
            }
            .padding(.horizontal, 16)
        }
    }

    // MARK: - Hero Carousel
    private var heroCarouselView: some View {
        let heroList = Array(trendingTracks.prefix(5))
        return VStack(spacing: 8) {
            TabView(selection: $heroIndex) {
                ForEach(heroList.indices, id: \.self) { idx in
                    let track = heroList[idx]
                    Button {
                        player.play(track: track, newQueue: trendingTracks)
                    } label: {
                        ZStack(alignment: .bottomLeading) {
                            AsyncImage(url: URL(string: track.artworkUrl)) { phase in
                                if case .success(let img) = phase {
                                    img.resizable().scaledToFill()
                                } else {
                                    Rectangle().fill(Theme.surfaceDark)
                                }
                            }
                            .frame(height: 200)
                            .clipped()

                            // Dark gradient overlay
                            LinearGradient(
                                colors: [Color.clear, Color.black.opacity(0.85)],
                                startPoint: .top,
                                endPoint: .bottom
                            )

                            // Track info & play button
                            HStack(alignment: .bottom) {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text("SPOTLIGHT")
                                        .font(.system(size: 10, weight: .bold))
                                        .foregroundColor(Theme.soundCloudOrange)
                                        .tracking(1.5)

                                    Text(track.title)
                                        .font(.system(size: 18, weight: .heavy))
                                        .foregroundColor(.white)
                                        .lineLimit(1)

                                    Text(track.artist)
                                        .font(.system(size: 13, weight: .medium))
                                        .foregroundColor(.white.opacity(0.8))
                                        .lineLimit(1)
                                }

                                Spacer()

                                ZStack {
                                    Circle()
                                        .fill(Theme.accentGradient)
                                        .frame(width: 44, height: 44)
                                    Image(systemName: "play.fill")
                                        .font(.system(size: 18, weight: .bold))
                                        .foregroundColor(.white)
                                        .offset(x: 1)
                                }
                            }
                            .padding(16)
                        }
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.white.opacity(0.12), lineWidth: 1)
                        )
                        .padding(.horizontal, 16)
                    }
                    .buttonStyle(.plain)
                    .tag(idx)
                }
            }
            .tabViewStyle(PageTabViewStyle(indexDisplayMode: .never))
            .frame(height: 200)

            // Custom Page indicator dots
            HStack(spacing: 6) {
                ForEach(heroList.indices, id: \.self) { idx in
                    Capsule()
                        .fill(idx == heroIndex ? Theme.soundCloudOrange : Color.white.opacity(0.2))
                        .frame(width: idx == heroIndex ? 18 : 6, height: 6)
                        .animation(.easeInOut(duration: 0.3), value: heroIndex)
                }
            }
            .padding(.top, 4)
        }
    }

    // MARK: - Section Header
    private func sectionHeader(title: String, subtitle: String) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.system(size: 19, weight: .bold))
                .foregroundColor(Theme.textPrimary)
            Text(subtitle)
                .font(.system(size: 12))
                .foregroundColor(Theme.textSecondary)
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Chart Row
    private func chartRow(rank: Int, track: Track) -> some View {
        Button {
            player.play(track: track, newQueue: topCharts)
        } label: {
            HStack(spacing: 12) {
                Text("\(rank)")
                    .font(.system(size: 15, weight: .heavy))
                    .foregroundColor(rank <= 3 ? Theme.soundCloudOrange : Theme.textTertiary)
                    .frame(width: 24)

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

                    Text(track.artist)
                        .font(.system(size: 12))
                        .foregroundColor(Theme.textSecondary)
                        .lineLimit(1)
                }

                Spacer()

                Button {
                    db.toggleLike(track: track)
                } label: {
                    Image(systemName: db.isLiked(trackId: track.id) ? "heart.fill" : "heart")
                        .font(.system(size: 16))
                        .foregroundColor(db.isLiked(trackId: track.id) ? Theme.soundCloudOrange : Theme.textSecondary)
                        .frame(width: 32, height: 32)
                }
                .buttonStyle(.plain)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Theme.surfaceDark.opacity(0.6))
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(Theme.borderSubtle, lineWidth: 0.5)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Artist Card
    private func artistCard(artist: ArtistHit) -> some View {
        VStack(spacing: 8) {
            AsyncImage(url: URL(string: artist.avatarUrl ?? "")) { phase in
                if case .success(let img) = phase {
                    img.resizable().scaledToFill()
                } else {
                    Circle().fill(Theme.surfaceDark)
                        .overlay(Image(systemName: "person.fill").foregroundColor(Theme.soundCloudOrange))
                }
            }
            .frame(width: 80, height: 80)
            .clipShape(Circle())
            .overlay(Circle().stroke(Theme.soundCloudOrange.opacity(0.5), lineWidth: 1.5))

            Text(artist.name)
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(Theme.textPrimary)
                .lineLimit(1)
                .frame(width: 90)

            Button {
                db.toggleFollow(artistName: artist.name)
            } label: {
                Text(db.isFollowed(artistName: artist.name) ? "Following" : "Follow")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(db.isFollowed(artistName: artist.name) ? Theme.textPrimary : .black)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 5)
                    .background(
                        db.isFollowed(artistName: artist.name)
                            ? AnyShapeStyle(Theme.surfaceDark)
                            : AnyShapeStyle(Theme.accentGradient)
                    )
                    .clipShape(Capsule())
            }
            .buttonStyle(.plain)
        }
        .frame(width: 100)
    }

    private func loadHomeData() async {
        isLoading = true
        async let fetchedTrending = KVMusicApi.shared.fetchCharts()
        async let fetchedCharts = KVMusicApi.shared.fetchCharts()
        async let fetchedReleases = KVMusicApi.shared.fetchNewReleases()
        async let searchRes = KVMusicApi.shared.universalSearch(query: "Top", region: "US")

        let (t, c, r, s) = await (fetchedTrending, fetchedCharts, fetchedReleases, searchRes)
        await MainActor.run {
            self.trendingTracks = t
            self.topCharts = c
            self.newReleases = r
            self.featuredArtists = s.artists
            self.isLoading = false
        }
    }

    private func filterByGenre(_ genre: String) async {
        if genre == "All" {
            await loadHomeData()
            return
        }
        isLoading = true
        let results = await KVMusicApi.shared.search(query: genre, region: "US")
        await MainActor.run {
            self.trendingTracks = results
            self.isLoading = false
        }
    }
}
