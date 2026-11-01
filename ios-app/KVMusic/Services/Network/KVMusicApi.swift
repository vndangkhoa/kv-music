import Foundation

public final class KVMusicApi: ObservableObject {
    public static let shared = KVMusicApi()

    @Published public var baseUrl: String {
        didSet {
            UserDefaults.standard.set(baseUrl, forKey: "kvmusic_base_url")
        }
    }

    private let session: URLSession

    public init() {
        let stored = UserDefaults.standard.string(forKey: "kvmusic_base_url")
        self.baseUrl = stored ?? "https://sp.khoavo.myds.me"
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 15
        config.timeoutIntervalForResource = 30
        self.session = URLSession(configuration: config)
    }

    public func setBaseUrl(_ url: String) {
        var formatted = url.trimmingCharacters(in: .whitespacesAndNewlines)
        if !formatted.hasPrefix("http://") && !formatted.hasPrefix("https://") {
            formatted = "http://\(formatted)"
        }
        if formatted.hasSuffix("/") {
            formatted = String(formatted.dropLast())
        }
        self.baseUrl = formatted
    }

    public func streamUrl(for trackId: String) -> URL? {
        let sampleMap: [String: String] = [
            "sample-1": "https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Sevish_-__nbsp_.mp3",
            "sample-2": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
            "sample-3": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
            "sample-4": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
            "sample-5": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
            "sample-6": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
            "sample-7": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
            "sample-8": "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3"
        ]
        if let direct = sampleMap[trackId], let url = URL(string: direct) {
            return url
        }
        return URL(string: "\(baseUrl)/api/stream/\(trackId)?fmt=m4a")
    }

    public func search(query: String) async -> [Track] {
        guard let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(baseUrl)/api/search?q=\(encoded)") else {
            return sampleTracks.filter { $0.title.localizedCaseInsensitiveContains(query) || $0.artist.localizedCaseInsensitiveContains(query) }
        }
        do {
            let (data, _) = try await session.data(from: url)
            let response = try JSONDecoder().decode(SearchResponse.self, from: data)
            if !response.tracks.isEmpty { return response.tracks }
        } catch {
            print("[KVMusicApi] search error: \(error)")
        }
        let filtered = sampleTracks.filter { $0.title.localizedCaseInsensitiveContains(query) || $0.artist.localizedCaseInsensitiveContains(query) }
        return filtered.isEmpty ? sampleTracks : filtered
    }

    public func universalSearch(query: String) async -> UniversalSearchResponse {
        guard let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(baseUrl)/api/universal-search?q=\(encoded)") else {
            return UniversalSearchResponse(songs: sampleTracks, albums: sampleAlbums, playlists: samplePlaylists, artists: sampleArtists)
        }
        do {
            let (data, _) = try await session.data(from: url)
            let res = try JSONDecoder().decode(UniversalSearchResponse.self, from: data)
            if !res.songs.isEmpty || !res.artists.isEmpty { return res }
        } catch {
            print("[KVMusicApi] universalSearch error: \(error)")
        }
        return UniversalSearchResponse(songs: sampleTracks, albums: sampleAlbums, playlists: samplePlaylists, artists: sampleArtists)
    }

    public func getSuggestions(query: String) async -> [String] {
        guard let encoded = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(baseUrl)/api/suggestions?q=\(encoded)") else {
            return sampleSuggestions.filter { $0.localizedCaseInsensitiveContains(query) }
        }
        do {
            let (data, _) = try await session.data(from: url)
            let res = try JSONDecoder().decode([String].self, from: data)
            if !res.isEmpty { return res }
        } catch {}
        return sampleSuggestions.filter { $0.localizedCaseInsensitiveContains(query) }
    }

    public func getCharts(country: String = "VN", chartType: String = "trending") async -> [Track] {
        guard let url = URL(string: "\(baseUrl)/api/charts?country=\(country)&chart_type=\(chartType)") else {
            return sampleTracks
        }
        do {
            let (data, _) = try await session.data(from: url)
            let response = try JSONDecoder().decode(SearchResponse.self, from: data)
            if !response.tracks.isEmpty { return response.tracks }
        } catch {}
        return sampleTracks
    }

    public func getNewReleases(country: String = "VN") async -> [Track] {
        guard let url = URL(string: "\(baseUrl)/api/new-releases?country=\(country)") else {
            return Array(sampleTracks.reversed())
        }
        do {
            let (data, _) = try await session.data(from: url)
            let response = try JSONDecoder().decode(SearchResponse.self, from: data)
            if !response.tracks.isEmpty { return response.tracks }
        } catch {}
        return Array(sampleTracks.reversed())
    }

    public func getArtists(region: String = "vn") async -> [ArtistHit] {
        guard let url = URL(string: "\(baseUrl)/api/artists?region=\(region)") else {
            return sampleArtists
        }
        do {
            let (data, _) = try await session.data(from: url)
            let response = try JSONDecoder().decode(ArtistsResponse.self, from: data)
            if !response.artists.isEmpty { return response.artists }
        } catch {}
        return sampleArtists
    }

    public func getRecommendations(trackId: String) async -> [Track] {
        guard let url = URL(string: "\(baseUrl)/api/recommendations?id=\(trackId)") else {
            return []
        }
        do {
            let (data, _) = try await session.data(from: url)
            return try JSONDecoder().decode([Track].self, from: data)
        } catch {
            return []
        }
    }

    public func getLyrics(trackId: String, title: String, artist: String) async -> [LyricLine] {
        guard let encTitle = title.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let encArtist = artist.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed),
              let url = URL(string: "\(baseUrl)/api/lyrics?video_id=\(trackId)&track=\(encTitle)&artist=\(encArtist)") else {
            return []
        }
        do {
            let (data, _) = try await session.data(from: url)
            let response = try JSONDecoder().decode(SyncedLyricsResponse.self, from: data)
            if let lrc = response.syncedLyrics, !lrc.isEmpty {
                return parseLRC(lrc)
            }
            if let plain = response.plainLyrics, !plain.isEmpty {
                return plain.components(separatedBy: .newlines).enumerated().map { idx, line in
                    LyricLine(time: Double(idx * 4), text: line)
                }
            }
        } catch {}
        return []
    }

    private func parseLRC(_ lrc: String) -> [LyricLine] {
        var result: [LyricLine] = []
        let lines = lrc.components(separatedBy: .newlines)
        for line in lines {
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            guard trimmed.hasPrefix("["), let closingBracket = trimmed.firstIndex(of: "]") else { continue }
            let timeString = String(trimmed[trimmed.index(after: trimmed.startIndex)..<closingBracket])
            let text = String(trimmed[trimmed.index(after: closingBracket)...]).trimmingCharacters(in: .whitespaces)
            let parts = timeString.split(separator: ":")
            if parts.count == 2, let min = Double(parts[0]), let sec = Double(parts[1]) {
                let seconds = min * 60.0 + sec
                result.append(LyricLine(time: seconds, text: text))
            }
        }
        return result.sorted { $0.time < $1.time }
    }

    // MARK: - Convenience Wrappers
    public func search(query: String, region: String = "US") async -> [Track] {
        await search(query: query)
    }

    public func universalSearch(query: String, region: String = "US") async -> UniversalSearchResponse {
        await universalSearch(query: query)
    }

    public func fetchSuggestions(query: String) async -> [String] {
        await getSuggestions(query: query)
    }

    public func fetchCharts(country: String = "VN") async -> [Track] {
        await getCharts(country: country)
    }

    public func fetchNewReleases(country: String = "VN") async -> [Track] {
        await getNewReleases(country: country)
    }

    public func fetchLyrics(for trackId: String, title: String = "", artist: String = "") async -> [LyricLine] {
        let lines = await getLyrics(trackId: trackId, title: title, artist: artist)
        if !lines.isEmpty { return lines }
        return sampleLyrics
    }
}

// MARK: - Sample Fallback Curated Data
public let sampleTracks: [Track] = [
    Track(
        id: "sample-1",
        title: "Midnight City",
        artist: "M83",
        album: "Hurry Up, We're Dreaming",
        duration: 243,
        coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&q=80",
        url: "https://sp.khoavo.myds.me/api/stream/sample-1"
    ),
    Track(
        id: "sample-2",
        title: "Starboy (SoundCloud Remix)",
        artist: "The Weeknd ft. Daft Punk",
        album: "Starboy",
        duration: 230,
        coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80",
        url: "https://sp.khoavo.myds.me/api/stream/sample-2"
    ),
    Track(
        id: "sample-3",
        title: "Resonance",
        artist: "HOME",
        album: "Odyssey",
        duration: 212,
        coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80",
        url: "https://sp.khoavo.myds.me/api/stream/sample-3"
    ),
    Track(
        id: "sample-4",
        title: "After Dark",
        artist: "Mr.Kitty",
        album: "Time",
        duration: 259,
        coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80",
        url: "https://sp.khoavo.myds.me/api/stream/sample-4"
    ),
    Track(
        id: "sample-5",
        title: "Cắt Đôi Nỗi Sầu",
        artist: "Tăng Duy Tân",
        album: "Single",
        duration: 185,
        coverUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500&q=80",
        url: "https://sp.khoavo.myds.me/api/stream/sample-5"
    ),
    Track(
        id: "sample-6",
        title: "Nơi Này Có Anh",
        artist: "Sơn Tùng M-TP",
        album: "m-tp M-TP",
        duration: 260,
        coverUrl: "https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=500&q=80",
        url: "https://sp.khoavo.myds.me/api/stream/sample-6"
    ),
    Track(
        id: "sample-7",
        title: "Glimpse of Us",
        artist: "Joji",
        album: "SMITHEREENS",
        duration: 233,
        coverUrl: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&q=80",
        url: "https://sp.khoavo.myds.me/api/stream/sample-7"
    ),
    Track(
        id: "sample-8",
        title: "Waiting For Love",
        artist: "Avicii",
        album: "Stories",
        duration: 230,
        coverUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&q=80",
        url: "https://sp.khoavo.myds.me/api/stream/sample-8"
    )
]

public let sampleArtists: [ArtistHit] = [
    ArtistHit(id: "art-1", name: "The Weeknd", avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&q=80", photo: nil, subscribers: "32M", followers: "32M"),
    ArtistHit(id: "art-2", name: "Sơn Tùng M-TP", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80", photo: nil, subscribers: "10.4M", followers: "10.4M"),
    ArtistHit(id: "art-3", name: "Daft Punk", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&q=80", photo: nil, subscribers: "18.2M", followers: "18.2M"),
    ArtistHit(id: "art-4", name: "Alan Walker", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80", photo: nil, subscribers: "45M", followers: "45M"),
    ArtistHit(id: "art-5", name: "Joji", avatar: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&q=80", photo: nil, subscribers: "8.9M", followers: "8.9M")
]

public let sampleAlbums: [AlbumHit] = [
    AlbumHit(id: "alb-1", title: "Starboy", artist: "The Weeknd", coverUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&q=80", year: "2016"),
    AlbumHit(id: "alb-2", title: "Random Access Memories", artist: "Daft Punk", coverUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80", year: "2013"),
    AlbumHit(id: "alb-3", title: "Stories", artist: "Avicii", coverUrl: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=500&q=80", year: "2015")
]

public let samplePlaylists: [PlaylistHit] = [
    PlaylistHit(id: "pl-1", title: "SoundCloud Trending EDM", author: "SoundCloud Curators", coverUrl: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80", trackCount: 50),
    PlaylistHit(id: "pl-2", title: "Late Night Lo-Fi Beats", author: "ChilledCow", coverUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&q=80", trackCount: 42)
]

public let sampleSuggestions: [String] = [
    "Midnight City", "The Weeknd Starboy", "Alan Walker Faded", "Lo-Fi Hip Hop Beats", "Sơn Tùng M-TP", "EDM Festival Mix 2024", "Phonk Workout"
]

public let sampleLyrics: [LyricLine] = [
    LyricLine(time: 0.0, text: "♪ (Intro - Synth chords) ♪"),
    LyricLine(time: 12.0, text: "Waiting in a car"),
    LyricLine(time: 18.0, text: "Waiting for a ride in the dark"),
    LyricLine(time: 25.0, text: "The night city grows, look and see her shine"),
    LyricLine(time: 34.0, text: "Under the stars, looking at the city lights"),
    LyricLine(time: 44.0, text: "Waiting in a car, waiting for a ride in the dark"),
    LyricLine(time: 55.0, text: "The city is my church, it wraps in the blinding twilight"),
    LyricLine(time: 68.0, text: "♪ (Saxophone & Synth solo) ♪"),
    LyricLine(time: 85.0, text: "Looking at the skyline through the window glass"),
    LyricLine(time: 102.0, text: "Tomorrow is another day, but tonight belongs to us")
]
