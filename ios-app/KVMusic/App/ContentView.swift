import SwiftUI

public enum MainTab: Int, CaseIterable {
    case home = 0
    case search = 1
    case library = 2
    case settings = 3

    var title: String {
        switch self {
        case .home: return "Home"
        case .search: return "Search"
        case .library: return "Library"
        case .settings: return "Settings"
        }
    }

    var icon: String {
        switch self {
        case .home: return "house.fill"
        case .search: return "magnifyingglass"
        case .library: return "books.vertical.fill"
        case .settings: return "gearshape.fill"
        }
    }
}

public struct ContentView: View {
    @ObservedObject var player = PlayerManager.shared
    @State private var selectedTab: MainTab = .home

    public init() {}

    public var body: some View {
        ZStack(alignment: .bottom) {
            // Main Tab Content
            Group {
                switch selectedTab {
                case .home:
                    HomeView()
                case .search:
                    SearchView()
                case .library:
                    LibraryView()
                case .settings:
                    SettingsView()
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)

            // Bottom Stack: MiniPlayer + Custom Tab Bar
            VStack(spacing: 0) {
                // Mini Player docked directly above tab bar
                if player.currentTrack != nil {
                    MiniPlayerBar()
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                }

                // Custom Tab Bar
                bottomTabBar
            }
        }
        .ignoresSafeArea(.keyboard, edges: .bottom)
        .fullScreenCover(isPresented: $player.isFullPlayerPresented) {
            FullPlayerView()
        }
        .onAppear {
            handleLaunchArguments()
        }
    }

    private func handleLaunchArguments() {
        let args = ProcessInfo.processInfo.arguments
        if args.contains("-search") || (args.contains("-tab") && args.contains("search")) {
            selectedTab = .search
        } else if args.contains("-library") || (args.contains("-tab") && args.contains("library")) {
            selectedTab = .library
        } else if args.contains("-settings") || (args.contains("-tab") && args.contains("settings")) {
            selectedTab = .settings
        }

        if args.contains("-play") || args.contains("-fullplayer") {
            let track = sampleTracks[0]
            player.play(track: track, newQueue: sampleTracks)
            if args.contains("-fullplayer") {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                    player.isFullPlayerPresented = true
                }
            }
        }
    }

    // MARK: - Bottom Tab Bar
    private var bottomTabBar: some View {
        HStack(spacing: 0) {
            ForEach(MainTab.allCases, id: \.self) { tab in
                let isSelected = selectedTab == tab

                Button {
                    withAnimation(.easeInOut(duration: 0.15)) {
                        selectedTab = tab
                    }
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: tab.icon)
                            .font(.system(size: 20, weight: isSelected ? .bold : .regular))
                            .foregroundColor(isSelected ? Theme.soundCloudOrange : Theme.textSecondary)

                        Text(tab.title)
                            .font(.system(size: 11, weight: isSelected ? .bold : .medium))
                            .foregroundColor(isSelected ? Theme.soundCloudOrange : Theme.textSecondary)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 8)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.bottom, 20)
        .background(
            Theme.surfaceDark
                .overlay(alignment: Alignment.top) {
                    Rectangle()
                        .fill(Theme.borderSubtle)
                        .frame(height: 0.5)
                }
        )
    }
}
