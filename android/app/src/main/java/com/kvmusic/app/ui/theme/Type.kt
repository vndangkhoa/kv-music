package com.kvmusic.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

val LargeTitle = TextStyle(
    fontSize = 34.sp,
    fontWeight = FontWeight.ExtraBold,
    letterSpacing = (-0.02).em,
    lineHeight = 36.sp
)
val HeroTitle = TextStyle(
    fontSize = 24.sp,
    fontWeight = FontWeight.ExtraBold,
    letterSpacing = (-0.02).em
)
val PlayerTitle = TextStyle(
    fontSize = 22.sp,
    fontWeight = FontWeight.Bold,
    letterSpacing = (-0.015).em
)
val SectionHeader = TextStyle(
    fontSize = 20.sp,
    fontWeight = FontWeight.Bold,
    letterSpacing = (-0.01).em
)
val NavTitle = TextStyle(
    fontSize = 17.sp,
    fontWeight = FontWeight.SemiBold,
    letterSpacing = (-0.01).em
)
val BodyRow = TextStyle(
    fontSize = 16.sp,
    fontWeight = FontWeight.Medium,
    letterSpacing = (-0.01).em
)
val TrackTitle = TextStyle(
    fontSize = 15.sp,
    fontWeight = FontWeight.Medium
)
val Chip = TextStyle(
    fontSize = 14.sp,
    fontWeight = FontWeight.Medium
)
val CardTitle = TextStyle(
    fontSize = 12.sp,
    fontWeight = FontWeight.SemiBold,
    letterSpacing = (-0.005).em
)
val Meta = TextStyle(
    fontSize = 12.sp,
    fontWeight = FontWeight.Normal
)
val Eyebrow = TextStyle(
    fontSize = 10.sp,
    fontWeight = FontWeight.SemiBold,
    letterSpacing = 0.11.em
)

val KvTypography = Typography(
    displayLarge = LargeTitle,
    displayMedium = HeroTitle,
    displaySmall = PlayerTitle,
    headlineLarge = SectionHeader,
    headlineMedium = NavTitle,
    headlineSmall = BodyRow,
    titleLarge = TrackTitle,
    titleSmall = CardTitle,
    bodyLarge = BodyRow,
    bodyMedium = TrackTitle,
    bodySmall = Meta,
    labelLarge = Chip,
    labelMedium = Meta,
    labelSmall = Eyebrow
)
