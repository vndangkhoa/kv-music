import SwiftUI

public struct SoundCloudWaveformView: View {
    public let bars: [Float]
    public let progressFraction: Double // 0.0 to 1.0
    public let isInteractive: Bool
    public var onSeek: ((Double) -> Void)? = nil

    @State private var isScrubbing: Bool = false
    @State private var scrubFraction: Double = 0.0

    public init(
        bars: [Float],
        progressFraction: Double,
        isInteractive: Bool = true,
        onSeek: ((Double) -> Void)? = nil
    ) {
        self.bars = bars
        self.progressFraction = progressFraction
        self.isInteractive = isInteractive
        self.onSeek = onSeek
    }

    public init(
        bars: [Float],
        progress: Double = 0.0,
        height: CGFloat = 40,
        barWidth: CGFloat = 3,
        barGap: CGFloat = 2,
        isInteractive: Bool = true,
        onSeek: ((Double) -> Void)? = nil
    ) {
        self.bars = bars
        self.progressFraction = progress
        self.isInteractive = isInteractive
        self.onSeek = onSeek
    }

    public var body: some View {
        GeometryReader { geo in
            let width = geo.size.width
            let height = geo.size.height
            let currentFraction = isScrubbing ? scrubFraction : progressFraction
            let activeWidth = max(0, min(width, width * CGFloat(currentFraction)))

            ZStack(alignment: .leading) {
                // Waveform Canvas
                Canvas { context, size in
                    let barCount = bars.isEmpty ? 50 : bars.count
                    let totalSpacingRatio: CGFloat = 0.35
                    let barWidth = (size.width * (1.0 - totalSpacingRatio)) / CGFloat(barCount)
                    let spacing = (size.width * totalSpacingRatio) / CGFloat(max(1, barCount - 1))

                    for i in 0..<barCount {
                        let x = CGFloat(i) * (barWidth + spacing)
                        let barFraction = bars.indices.contains(i) ? CGFloat(bars[i]) : 0.4
                        let barH = max(4, size.height * barFraction)
                        let y = (size.height - barH) / 2

                        let rect = CGRect(x: x, y: y, width: max(1.5, barWidth), height: barH)
                        let isBarActive = (x + barWidth / 2) <= activeWidth

                        let color = isBarActive ? KVMusicTheme.soundCloudNeonOrange : KVMusicTheme.waveformInactiveDark
                        context.fill(Path(roundedRect: rect, cornerRadius: 1.5), with: .color(color))
                    }
                }

                // Playhead line & handle when interactive
                if isInteractive {
                    Rectangle()
                        .fill(Color.white)
                        .frame(width: isScrubbing ? 3 : 2, height: height)
                        .offset(x: max(0, min(width - 2, activeWidth - 1)))

                    Circle()
                        .fill(KVMusicTheme.soundCloudNeonOrange)
                        .overlay(Circle().stroke(Color.white, lineWidth: 2))
                        .frame(width: 14, height: 14)
                        .offset(x: max(0, min(width - 14, activeWidth - 7)), y: (height - 14) / 2)
                }
            }
            .contentShape(Rectangle())
            .gesture(
                isInteractive ? DragGesture(minimumDistance: 0)
                    .onChanged { value in
                        isScrubbing = true
                        let clamped = max(0.0, min(1.0, Double(value.location.x / width)))
                        scrubFraction = clamped
                    }
                    .onEnded { value in
                        let clamped = max(0.0, min(1.0, Double(value.location.x / width)))
                        isScrubbing = false
                        onSeek?(clamped)
                    } : nil
            )
        }
        .frame(height: isInteractive ? 48 : 28)
    }
}
