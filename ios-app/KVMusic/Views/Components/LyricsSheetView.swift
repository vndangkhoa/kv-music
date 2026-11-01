import SwiftUI

public struct LyricsSheetView: View {
    @ObservedObject var player = PlayerManager.shared
    @Environment(\.dismiss) private var dismiss

    @State private var lyrics: [LyricLine] = []
    @State private var isLoading: Bool = true
    @State private var activeLineIndex: Int = 0

    public init() {}

    public var body: some View {
        ZStack {
            Theme.backgroundDark
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Lyrics")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundColor(Theme.textPrimary)
                        if let track = player.currentTrack {
                            Text("\(track.title) • \(track.artist)")
                                .font(.system(size: 13))
                                .foregroundColor(Theme.textSecondary)
                                .lineLimit(1)
                        }
                    }

                    Spacer()

                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 24))
                            .foregroundColor(Theme.textSecondary)
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 20)
                .padding(.bottom, 12)

                Divider()
                    .background(Theme.borderSubtle)

                if isLoading {
                    Spacer()
                    ProgressView()
                        .tint(Theme.soundCloudOrange)
                        .scaleEffect(1.2)
                    Spacer()
                } else if lyrics.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "quote.bubble")
                            .font(.system(size: 48))
                            .foregroundColor(Theme.textTertiary)
                        Text("No lyrics available")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(Theme.textSecondary)
                        Text("Enjoy the music")
                            .font(.system(size: 14))
                            .foregroundColor(Theme.textTertiary)
                    }
                    Spacer()
                } else {
                    ScrollViewReader { proxy in
                        ScrollView(.vertical, showsIndicators: false) {
                            LazyVStack(alignment: .leading, spacing: 20) {
                                ForEach(lyrics.indices, id: \.self) { idx in
                                    let line = lyrics[idx]
                                    let isActive = idx == activeLineIndex

                                    Button {
                                        player.seek(toSeconds: line.timestamp)
                                    } label: {
                                        Text(line.text.isEmpty ? "♪ ♪ ♪" : line.text)
                                            .font(.system(size: isActive ? 22 : 17, weight: isActive ? .bold : .medium))
                                            .foregroundColor(isActive ? Theme.soundCloudOrange : Theme.textPrimary.opacity(0.45))
                                            .multilineTextAlignment(.leading)
                                            .scaleEffect(isActive ? 1.05 : 1.0, anchor: .leading)
                                            .animation(.spring(response: 0.35, dampingFraction: 0.7), value: isActive)
                                    }
                                    .buttonStyle(.plain)
                                    .id(idx)
                                }
                            }
                            .padding(.horizontal, 24)
                            .padding(.vertical, 32)
                        }
                        .onChange(of: player.currentPositionSeconds) { newPos in
                            updateActiveLine(position: newPos, proxy: proxy)
                        }
                    }
                }
            }
        }
        .task {
            await loadLyrics()
        }
    }

    private func loadLyrics() async {
        guard let track = player.currentTrack else {
            isLoading = false
            return
        }
        isLoading = true
        let fetched = await KVMusicApi.shared.fetchLyrics(for: track.id)
        await MainActor.run {
            self.lyrics = fetched
            self.isLoading = false
        }
    }

    private func updateActiveLine(position: Double, proxy: ScrollViewProxy) {
        guard !lyrics.isEmpty else { return }
        var foundIndex = 0
        for (i, line) in lyrics.enumerated() {
            if position >= line.timestamp {
                foundIndex = i
            } else {
                break
            }
        }
        if foundIndex != activeLineIndex {
            activeLineIndex = foundIndex
            withAnimation(.easeInOut(duration: 0.3)) {
                proxy.scrollTo(foundIndex, anchor: .center)
            }
        }
    }
}
