import SwiftUI

public struct SettingsView: View {
    @AppStorage("kv_music_server_host") private var serverHost: String = "https://sp.khoavo.myds.me"
    @AppStorage("kv_music_audio_quality") private var audioQuality: String = "High (256k)"
    @AppStorage("kv_music_audio_format") private var audioFormat: String = "M4A"
    @AppStorage("kv_music_auto_cache") private var autoCache: Bool = true

    @State private var serverStatus: String = "Online"
    @State private var isTestingServer: Bool = false
    @State private var cacheSizeText: String = "24.8 MB"
    @State private var isClearCacheAlertPresented: Bool = false

    private let qualities = ["Normal (128k)", "High (256k)", "Ultra (320k)"]
    private let formats = ["M4A", "AAC", "MP3"]

    public init() {}

    public var body: some View {
        NavigationStack {
            ZStack {
                Theme.backgroundDark
                    .ignoresSafeArea()

                ScrollView(.vertical, showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 24) {
                        // Header
                        VStack(alignment: .leading, spacing: 2) {
                            Text("PREFERENCES")
                                .font(.system(size: 11, weight: .bold))
                                .foregroundColor(Theme.soundCloudOrange)
                                .tracking(1.0)
                            Text("Settings")
                                .font(.system(size: 26, weight: .heavy))
                                .foregroundColor(Theme.textPrimary)
                        }
                        .padding(.horizontal, 16)
                        .padding(.top, 12)

                        // Section: Server Connection
                        settingsSection(title: "Server Configuration") {
                            VStack(spacing: 12) {
                                HStack {
                                    Text("Status")
                                        .font(.system(size: 14))
                                        .foregroundColor(Theme.textSecondary)
                                    Spacer()
                                    HStack(spacing: 6) {
                                        Circle()
                                            .fill(serverStatus == "Online" ? Color.green : Color.red)
                                            .frame(width: 8, height: 8)
                                        Text(serverStatus)
                                            .font(.system(size: 13, weight: .bold))
                                            .foregroundColor(Theme.textPrimary)
                                    }
                                }

                                Divider().background(Theme.borderSubtle)

                                VStack(alignment: .leading, spacing: 6) {
                                    Text("Backend URL")
                                        .font(.system(size: 12, weight: .semibold))
                                        .foregroundColor(Theme.textTertiary)

                                    TextField("https://sp.khoavo.myds.me", text: $serverHost)
                                        .font(.system(size: 14))
                                        .foregroundColor(Theme.textPrimary)
                                        .padding(10)
                                        .background(Theme.surfaceDark)
                                        .clipShape(RoundedRectangle(cornerRadius: 8))
                                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.borderSubtle, lineWidth: 1))
                                }

                                Button {
                                    testServerConnection()
                                } label: {
                                    HStack(spacing: 8) {
                                        if isTestingServer {
                                            ProgressView().tint(Theme.soundCloudOrange)
                                        } else {
                                            Image(systemName: "arrow.triangle.2.circlepath")
                                        }
                                        Text(isTestingServer ? "Connecting..." : "Test Connection")
                                    }
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundColor(Theme.soundCloudOrange)
                                    .frame(maxWidth: .infinity)
                                    .frame(height: 38)
                                    .background(Theme.surfaceDark)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(Theme.soundCloudOrange.opacity(0.6), lineWidth: 1))
                                }
                            }
                        }

                        // Section: Audio & Playback
                        settingsSection(title: "Streaming & Audio Quality") {
                            VStack(spacing: 14) {
                                HStack {
                                    Text("Bitrate Quality")
                                        .font(.system(size: 14))
                                        .foregroundColor(Theme.textSecondary)
                                    Spacer()
                                    Picker("Quality", selection: $audioQuality) {
                                        ForEach(qualities, id: \.self) { q in
                                            Text(q).tag(q)
                                        }
                                    }
                                    .pickerStyle(.menu)
                                    .tint(Theme.soundCloudOrange)
                                }

                                Divider().background(Theme.borderSubtle)

                                HStack {
                                    Text("Audio Format")
                                        .font(.system(size: 14))
                                        .foregroundColor(Theme.textSecondary)
                                    Spacer()
                                    Picker("Format", selection: $audioFormat) {
                                        ForEach(formats, id: \.self) { f in
                                            Text(f).tag(f)
                                        }
                                    }
                                    .pickerStyle(.menu)
                                    .tint(Theme.soundCloudOrange)
                                }

                                Divider().background(Theme.borderSubtle)

                                Toggle(isOn: $autoCache) {
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Pre-cache Next Tracks")
                                            .font(.system(size: 14))
                                            .foregroundColor(Theme.textPrimary)
                                        Text("Zero-gap instant song switching")
                                            .font(.system(size: 12))
                                            .foregroundColor(Theme.textSecondary)
                                    }
                                }
                                .tint(Theme.soundCloudOrange)
                            }
                        }

                        // Section: Storage & Cache
                        settingsSection(title: "Storage & Cache") {
                            VStack(spacing: 12) {
                                HStack {
                                    Text("Cached Audio")
                                        .font(.system(size: 14))
                                        .foregroundColor(Theme.textSecondary)
                                    Spacer()
                                    Text(cacheSizeText)
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(Theme.textPrimary)
                                }

                                Divider().background(Theme.borderSubtle)

                                Button {
                                    isClearCacheAlertPresented = true
                                } label: {
                                    Text("Clear Playback Cache")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(Color.red.opacity(0.85))
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                }
                            }
                        }

                        // Section: About
                        settingsSection(title: "About KV-Music") {
                            VStack(spacing: 10) {
                                HStack {
                                    Text("App Version")
                                        .font(.system(size: 14))
                                        .foregroundColor(Theme.textSecondary)
                                    Spacer()
                                    Text("1.0.0 (Native SwiftUI)")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(Theme.textPrimary)
                                }

                                Divider().background(Theme.borderSubtle)

                                HStack {
                                    Text("Aesthetic Engine")
                                        .font(.system(size: 14))
                                        .foregroundColor(Theme.textSecondary)
                                    Spacer()
                                    Text("SoundCloud 70-bar LCG")
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(Theme.soundCloudOrange)
                                }
                            }
                        }

                        Spacer(minLength: 80)
                    }
                }
            }
            .navigationBarHidden(true)
            .alert("Clear Audio Cache?", isPresented: $isClearCacheAlertPresented) {
                Button("Cancel", role: .cancel) {}
                Button("Clear", role: .destructive) {
                    cacheSizeText = "0.0 MB"
                }
            } message: {
                Text("This will purge temporary audio stream buffers. Downloaded songs will not be affected.")
            }
        }
    }

    private func settingsSection<Content: View>(title: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(Theme.textSecondary)
                .textCase(.uppercase)
                .padding(.horizontal, 16)

            VStack(alignment: .leading, spacing: 10) {
                content()
            }
            .padding(16)
            .background(Theme.cardSurface)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Theme.borderSubtle, lineWidth: 1))
            .padding(.horizontal, 16)
        }
    }

    private func testServerConnection() {
        isTestingServer = true
        Task {
            let res = await KVMusicApi.shared.fetchCharts()
            await MainActor.run {
                self.serverStatus = res.isEmpty ? "Offline" : "Online"
                self.isTestingServer = false
            }
        }
    }
}
