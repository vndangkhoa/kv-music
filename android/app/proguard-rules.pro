# Kotlin reflection / annotations
-keepattributes Signature, InnerClasses, EnclosingMethod, *Annotation*, RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations

# kotlinx.serialization generated serializers
-keep,includedescriptorclasses class com.kvmusic.app.**$$serializer { *; }
-keepclassmembers class com.kvmusic.app.** {
    *** Companion;
}
-keepclasseswithmembers class com.kvmusic.app.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Media3 / ExoPlayer
-dontwarn androidx.media3.**
-keep class androidx.media3.** { *; }

# Retrofit
-keepattributes Signature, InnerClasses, EnclosingMethod, *Annotation*
-dontwarn retrofit2.**
-dontwarn okhttp3.**
-dontwarn okio.**

# Room
-dontwarn androidx.room.**
