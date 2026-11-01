import SwiftUI

public struct KVMusicTheme {
    // Primary Neon Orange Palette (SoundCloud signature)
    public static let soundCloudNeonOrange = Color(red: 255/255, green: 85/255, blue: 0/255) // #FF5500
    public static let soundCloudOrange = soundCloudNeonOrange
    public static let orangeGradientStart = Color(red: 255/255, green: 119/255, blue: 0/255) // #FF7700
    public static let orangeGradientEnd = Color(red: 255/255, green: 34/255, blue: 0/255)   // #FF2200

    // Backgrounds & Glass Surfaces
    public static let midnightBlack = Color(red: 5/255, green: 5/255, blue: 5/255)          // #050505
    public static let backgroundDark = midnightBlack
    public static let glassSurfaceDark = Color(red: 16/255, green: 16/255, blue: 18/255)     // #101012
    public static let surfaceDark = glassSurfaceDark
    public static let glassCardDark = Color(red: 24/255, green: 24/255, blue: 27/255)        // #18181B
    public static let cardSurface = glassCardDark
    public static let glassCardBorder = Color.white.opacity(0.12)
    public static let borderSubtle = glassCardBorder

    // Text & Icons
    public static let textElectricWhite = Color.white
    public static let textPrimary = textElectricWhite
    public static let textLightGray = Color(red: 161/255, green: 161/255, blue: 170/255)    // #A1A1AA
    public static let textSecondary = textLightGray
    public static let textDarkMuted = Color(red: 82/255, green: 82/255, blue: 91/255)       // #52525B
    public static let textTertiary = textDarkMuted

    // Functional Accents
    public static let waveformInactiveDark = Color(red: 39/255, green: 39/255, blue: 42/255) // #27272A
    public static let chartGold = Color(red: 255/255, green: 215/255, blue: 0/255)           // #FFD700
    public static let livePulseGreen = Color(red: 16/255, green: 185/255, blue: 129/255)     // #10B981
    public static let downloadGreen = Color(red: 46/255, green: 204/255, blue: 113/255)      // #2ECC71
    public static let historyBlue = Color(red: 0/255, green: 168/255, blue: 255/255)         // #00A8FF

    public static let orangeGradient = LinearGradient(
        colors: [orangeGradientStart, orangeGradientEnd],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )
    public static let accentGradient = orangeGradient
}

public typealias Theme = KVMusicTheme
