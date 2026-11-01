import Foundation

public func formatDuration(_ seconds: Int) -> String {
    let min = seconds / 60
    let sec = seconds % 60
    return String(format: "%02d:%02d", min, sec)
}

public struct Track: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let title: String
    public let artist: String
    public let album: String?
    public let duration: Int
    public let coverUrl: String
    public let url: String
    public let viewCount: Int64?
    public let likeCount: Int64?
    public let commentCount: Int64?
    public let bitrate: Int?
    public let codec: String?

    public init(
        id: String = "",
        title: String = "",
        artist: String = "",
        album: String? = nil,
        duration: Int = 0,
        coverUrl: String = "",
        url: String = "",
        viewCount: Int64? = nil,
        likeCount: Int64? = nil,
        commentCount: Int64? = nil,
        bitrate: Int? = nil,
        codec: String? = nil
    ) {
        self.id = id
        self.title = title
        self.artist = artist
        self.album = album
        self.duration = duration
        self.coverUrl = coverUrl
        self.url = url
        self.viewCount = viewCount
        self.likeCount = likeCount
        self.commentCount = commentCount
        self.bitrate = bitrate
        self.codec = codec
    }

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case artist
        case album
        case duration
        case coverUrl = "cover_url"
        case url
        case viewCount = "view_count"
        case likeCount = "like_count"
        case commentCount = "comment_count"
        case bitrate
        case codec
    }

    public var artworkUrl: String { coverUrl }

    public var formattedDuration: String {
        formatDuration(duration)
    }

    public var syntheticPlayCount: String {
        let hash = abs(id.hashValue)
        let count = Double(hash % 85 + 15) / 10.0
        return String(format: "%.1fM", count)
    }
}

public struct AlbumHit: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let title: String
    public let artist: String
    public let coverUrl: String
    public let year: String?

    public var artworkUrl: String? { coverUrl }

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case artist
        case coverUrl = "cover_url"
        case year
    }
}

public struct PlaylistHit: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let title: String
    public let author: String?
    public let coverUrl: String
    public let trackCount: Int?

    public var artworkUrl: String? { coverUrl }

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case author
        case coverUrl = "cover_url"
        case trackCount = "track_count"
    }
}

public struct ArtistHit: Identifiable, Codable, Hashable, Sendable {
    public let id: String
    public let name: String
    public let avatar: String?
    public let photo: String?
    public let subscribers: String?
    public let followers: String?

    public var avatarUrl: String? {
        if let a = avatar, !a.isEmpty { return a }
        return photo
    }

    public var displayPhoto: String {
        if let p = photo, !p.isEmpty { return p }
        return avatar ?? ""
    }

    public var displayFollowers: String {
        if let f = followers, !f.isEmpty { return f }
        if let s = subscribers, !s.isEmpty { return s }
        return "150K followers"
    }
}

public struct SearchResponse: Codable, Sendable {
    public let tracks: [Track]
    public init(tracks: [Track] = []) {
        self.tracks = tracks
    }
}

public struct ArtistsResponse: Codable, Sendable {
    public let artists: [ArtistHit]
    public init(artists: [ArtistHit] = []) {
        self.artists = artists
    }
}

public struct UniversalSearchResponse: Codable, Sendable {
    public let songs: [Track]
    public let albums: [AlbumHit]
    public let playlists: [PlaylistHit]
    public let artists: [ArtistHit]

    public var tracks: [Track] { songs }

    public init(
        songs: [Track] = [],
        albums: [AlbumHit] = [],
        playlists: [PlaylistHit] = [],
        artists: [ArtistHit] = []
    ) {
        self.songs = songs
        self.albums = albums
        self.playlists = playlists
        self.artists = artists
    }
}

public struct LyricLine: Identifiable, Codable, Hashable, Sendable {
    public var id: Double { time }
    public let time: Double // in seconds
    public let text: String

    public var timestamp: Double { time }

    public init(time: Double, text: String) {
        self.time = time
        self.text = text
    }
}

public struct SyncedLyricsResponse: Codable, Sendable {
    public let plainLyrics: String?
    public let syncedLyrics: String?
}

public struct User: Identifiable, Codable, Sendable {
    public let id: String
    public let name: String
    public let email: String
    public let avatarColor: String?
    public let createdAt: Int64?
    public let liked: [Track]?
    public let history: [Track]?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case email
        case avatarColor = "avatar_color"
        case createdAt = "created_at"
        case liked
        case history
    }
}

public struct AuthResponse: Codable, Sendable {
    public let user: User?
    public let token: String?
    public let error: String?
}

public struct PairResponse: Codable, Sendable {
    public let pairCode: String?
    public let user: User?
    public let token: String?
    public let error: String?

    enum CodingKeys: String, CodingKey {
        case pairCode = "pair_code"
        case user
        case token
        case error
    }
}

public struct AppUpdateInfo: Codable, Sendable {
    public let tag: String
    public let name: String
    public let notes: String
    public let apkUrl: String?
    public let pageUrl: String
}
