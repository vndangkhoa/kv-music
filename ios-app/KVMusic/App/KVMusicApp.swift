import SwiftUI

@main
public struct KVMusicApp: App {
    public init() {}

    public var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.dark)
                .background(Theme.backgroundDark)
        }
    }
}
