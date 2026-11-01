import Foundation
import Combine

public final class MusicDatabase: ObservableObject {
    public static let shared = MusicDatabase()

    @Published public private(set) var likedTracks: [Track] = []
    @Published public private(set) var historyTracks: [Track] = []
    @Published public private(set) var downloadedTracks: [Track] = []
    @Published public private(set) var followedArtistIds: Set<String> = ["artist-hngle", "artist-dangrangto", "artist-grey-d"]

    private let likedFile: URL
    private let historyFile: URL
    private let downloadsFile: URL
    private let artistsFile: URL

    public init() {
        let fileManager = FileManager.default
        let paths = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask)
        let baseDir = (paths.first ?? fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0])
            .appendingPathComponent("KVMusicData", isDirectory: true)

        if !fileManager.fileExists(atPath: baseDir.path) {
            try? fileManager.createDirectory(at: baseDir, withIntermediateDirectories: true)
        }

        self.likedFile = baseDir.appendingPathComponent("liked.json")
        self.historyFile = baseDir.appendingPathComponent("history.json")
        self.downloadsFile = baseDir.appendingPathComponent("downloads.json")
        self.artistsFile = baseDir.appendingPathComponent("artists.json")

        load()
    }

    private func load() {
        let decoder = JSONDecoder()
        if let data = try? Data(contentsOf: likedFile),
           let list = try? decoder.decode([Track].self, from: data) {
            self.likedTracks = list
        }
        if let data = try? Data(contentsOf: historyFile),
           let list = try? decoder.decode([Track].self, from: data) {
            self.historyTracks = list
        }
        if let data = try? Data(contentsOf: downloadsFile),
           let list = try? decoder.decode([Track].self, from: data) {
            self.downloadedTracks = list
        }
        if let data = try? Data(contentsOf: artistsFile),
           let set = try? decoder.decode(Set<String>.self, from: data) {
            self.followedArtistIds = set
        }
    }

    public func isLiked(trackId: String) -> Bool {
        likedTracks.contains { $0.id == trackId }
    }

    public func toggleLike(track: Track) {
        if isLiked(trackId: track.id) {
            likedTracks.removeAll { $0.id == track.id }
        } else {
            likedTracks.insert(track, at: 0)
        }
        persistLiked()
    }

    public func recordHistory(track: Track) {
        var updated = historyTracks.filter { $0.id != track.id }
        updated.insert(track, at: 0)
        if updated.count > 100 {
            updated = Array(updated.prefix(100))
        }
        historyTracks = updated
        persistHistory()
    }

    public func clearHistory() {
        historyTracks.removeAll()
        persistHistory()
    }

    public func isDownloaded(trackId: String) -> Bool {
        downloadedTracks.contains { $0.id == trackId }
    }

    public func toggleDownload(track: Track) {
        if isDownloaded(trackId: track.id) {
            downloadedTracks.removeAll { $0.id == track.id }
        } else {
            downloadedTracks.insert(track, at: 0)
        }
        persistDownloads()
    }

    public func isFollowed(artistId: String) -> Bool {
        followedArtistIds.contains(artistId)
    }

    public var followedArtists: Set<String> {
        followedArtistIds
    }

    public func isFollowed(artistName: String) -> Bool {
        isFollowed(artistId: artistName)
    }

    public func toggleFollow(artistId: String) {
        if followedArtistIds.contains(artistId) {
            followedArtistIds.remove(artistId)
        } else {
            followedArtistIds.insert(artistId)
        }
        persistArtists()
    }

    public func toggleFollow(artistName: String) {
        toggleFollow(artistId: artistName)
    }

    private func persistLiked() {
        if let data = try? JSONEncoder().encode(likedTracks) {
            try? data.write(to: likedFile, options: .atomic)
        }
    }

    private func persistHistory() {
        if let data = try? JSONEncoder().encode(historyTracks) {
            try? data.write(to: historyFile, options: .atomic)
        }
    }

    private func persistDownloads() {
        if let data = try? JSONEncoder().encode(downloadedTracks) {
            try? data.write(to: downloadsFile, options: .atomic)
        }
    }

    private func persistArtists() {
        if let data = try? JSONEncoder().encode(followedArtistIds) {
            try? data.write(to: artistsFile, options: .atomic)
        }
    }
}
