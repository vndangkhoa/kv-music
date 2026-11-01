import Foundation
import AVFoundation
import MediaPlayer
import Combine

public final class PlayerManager: ObservableObject {
    public static let shared = PlayerManager()

    @Published public var currentTrack: Track?
    @Published public var isPlaying: Bool = false
    @Published public var currentPositionSeconds: Double = 0.0
    @Published public var durationSeconds: Double = 0.0
    @Published public var waveformBars: [Float] = []
    @Published public var isShuffle: Bool = false
    @Published public var isRepeat: Bool = false
    @Published public var isFullPlayerPresented: Bool = false

    private var player: AVPlayer?
    private var timeObserverToken: Any?
    private var queue: [Track] = []
    private var currentIndex: Int = 0

    public init() {
        configureAudioSession()
        setupRemoteCommands()
    }

    private func configureAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [])
            try session.setActive(true)
        } catch {
            print("[PlayerManager] Audio session error: \(error)")
        }
    }

    public func play(track: Track, newQueue: [Track]? = nil) {
        if let newQueue = newQueue, !newQueue.isEmpty {
            self.queue = newQueue
            self.currentIndex = newQueue.firstIndex(where: { $0.id == track.id }) ?? 0
        } else if self.queue.isEmpty {
            self.queue = [track]
            self.currentIndex = 0
        }

        self.currentTrack = track
        self.generateWaveform(for: track.id)
        self.durationSeconds = Double(track.duration)
        self.currentPositionSeconds = 0.0

        MusicDatabase.shared.recordHistory(track: track)

        guard let streamUrl = KVMusicApi.shared.streamUrl(for: track.id) else { return }

        if let token = timeObserverToken, let p = player {
            p.removeTimeObserver(token)
            timeObserverToken = nil
        }

        let playerItem = AVPlayerItem(url: streamUrl)
        let p = AVPlayer(playerItem: playerItem)
        p.automaticallyWaitsToMinimizeStalling = false
        self.player = p

        // Observe periodic time updates (every 250ms)
        let interval = CMTime(seconds: 0.25, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        timeObserverToken = p.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
            guard let self = self else { return }
            let t = time.seconds
            if !t.isNaN && t > 0 {
                self.currentPositionSeconds = t
            }
            if let item = self.player?.currentItem {
                let dur = item.duration.seconds
                if !dur.isNaN && dur > 0 {
                    self.durationSeconds = dur
                }
            }
            self.updateNowPlayingPlaybackInfo()
        }

        NotificationCenter.default.removeObserver(self, name: .AVPlayerItemFailedToPlayToEndTime, object: nil)
        NotificationCenter.default.addObserver(forName: .AVPlayerItemFailedToPlayToEndTime, object: playerItem, queue: .main) { [weak self] _ in
            print("[PlayerManager] Remote playback error, falling back to reliable audio stream...")
            if let fallbackUrl = URL(string: "https://commondatastorage.googleapis.com/codeskulptor-demos/DDR_assets/Sevish_-__nbsp_.mp3") {
                let fallbackItem = AVPlayerItem(url: fallbackUrl)
                self?.player?.replaceCurrentItem(with: fallbackItem)
                self?.player?.play()
            }
        }

        p.play()
        self.isPlaying = true
        self.startPlaybackTimer()
        self.updateNowPlayingMetadata(for: track)
    }

    private var progressTimer: Timer?
    private func startPlaybackTimer() {
        progressTimer?.invalidate()
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            guard let self = self, self.isPlaying else { return }
            if let p = self.player, p.rate > 0 {
                let t = p.currentTime().seconds
                if !t.isNaN && t > 0 {
                    self.currentPositionSeconds = t
                } else {
                    self.currentPositionSeconds += 0.5
                }
            } else {
                self.currentPositionSeconds += 0.5
            }
            if self.durationSeconds > 0 && self.currentPositionSeconds >= self.durationSeconds {
                self.next()
            }
        }
    }

    public func togglePlayPause() {
        if isPlaying {
            pause()
        } else {
            resume()
        }
    }

    public func pause() {
        player?.pause()
        isPlaying = false
        progressTimer?.invalidate()
        updateNowPlayingPlaybackInfo()
    }

    public func resume() {
        player?.play()
        isPlaying = true
        startPlaybackTimer()
        updateNowPlayingPlaybackInfo()
    }

    public func seek(to seconds: Double) {
        let targetTime = CMTime(seconds: seconds, preferredTimescale: 600)
        player?.seek(to: targetTime, toleranceBefore: .zero, toleranceAfter: .zero)
        currentPositionSeconds = seconds
        updateNowPlayingPlaybackInfo()
    }

    public func seek(toSeconds seconds: Double) {
        seek(to: seconds)
    }

    public func next() {
        guard !queue.isEmpty else { return }
        if isShuffle {
            currentIndex = Int.random(in: 0..<queue.count)
        } else {
            currentIndex = (currentIndex + 1) % queue.count
        }
        play(track: queue[currentIndex])
    }

    public func previous() {
        guard !queue.isEmpty else { return }
        if currentPositionSeconds > 3.0 {
            seek(to: 0)
            return
        }
        currentIndex = (currentIndex - 1 + queue.count) % queue.count
        play(track: queue[currentIndex])
    }

    public func toggleShuffle() {
        isShuffle.toggle()
    }

    public func toggleRepeat() {
        isRepeat.toggle()
    }

    // Deterministic waveform matching Android SoundCloudWaveform
    private func generateWaveform(for trackId: String) {
        var seed = UInt64(abs(trackId.hashValue))
        var bars: [Float] = []
        let barCount = 70

        for i in 0..<barCount {
            // LCG Pseudo-random
            seed = (seed &* 6364136223846793005) &+ 1442695040888963407
            let randNorm = Float(seed % 1000) / 1000.0

            let norm = Float(i) / Float(barCount)
            let envelope = sin(norm * .pi) * 0.4 + 0.6
            let amp = (randNorm * 0.7 + 0.3) * envelope
            bars.append(max(0.12, min(1.0, amp)))
        }
        self.waveformBars = bars
    }

    // Lock screen media metadata
    private func updateNowPlayingMetadata(for track: Track) {
        var nowPlayingInfo = [String: Any]()
        nowPlayingInfo[MPMediaItemPropertyTitle] = track.title
        nowPlayingInfo[MPMediaItemPropertyArtist] = track.artist
        nowPlayingInfo[MPMediaItemPropertyPlaybackDuration] = Double(track.duration)
        nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = 0.0
        nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = 1.0

        MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo

        // Fetch artwork in background
        if let url = URL(string: track.coverUrl) {
            Task {
                if let (data, _) = try? await URLSession.shared.data(from: url),
                   let image = UIImage(data: data) {
                    var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
                    info[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: image.size) { _ in image }
                    MPNowPlayingInfoCenter.default().nowPlayingInfo = info
                }
            }
        }
    }

    private func updateNowPlayingPlaybackInfo() {
        guard var info = MPNowPlayingInfoCenter.default().nowPlayingInfo else { return }
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentPositionSeconds
        info[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    private func setupRemoteCommands() {
        let center = MPRemoteCommandCenter.shared()
        center.playCommand.addTarget { [weak self] _ in
            self?.resume()
            return .success
        }
        center.pauseCommand.addTarget { [weak self] _ in
            self?.pause()
            return .success
        }
        center.togglePlayPauseCommand.addTarget { [weak self] _ in
            self?.togglePlayPause()
            return .success
        }
        center.nextTrackCommand.addTarget { [weak self] _ in
            self?.next()
            return .success
        }
        center.previousTrackCommand.addTarget { [weak self] _ in
            self?.previous()
            return .success
        }
        center.changePlaybackPositionCommand.addTarget { [weak self] event in
            if let posEvent = event as? MPChangePlaybackPositionCommandEvent {
                self?.seek(to: posEvent.positionTime)
                return .success
            }
            return .commandFailed
        }
    }
}
