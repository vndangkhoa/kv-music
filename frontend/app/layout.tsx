import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import PlayerBar from "@/components/PlayerBar";
import MobileNav from "@/components/MobileNav";
import { PlayerProvider } from "@/context/PlayerContext";
import { LibraryProvider } from "@/context/LibraryContext";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Audiophile Web Player",
  description: "High-Fidelity Local-First Music Player",
  manifest: "/manifest.json",
  referrer: "no-referrer",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Audiophile Web Player",
  },
  icons: {
    icon: "/icons/icon-192x192.png",
    apple: "/icons/icon-512x512.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${outfit.variable} antialiased bg-black h-screen flex flex-col overflow-hidden text-white font-sans`}
      >
        <PlayerProvider>
          <LibraryProvider>
            <div className="flex-1 flex overflow-hidden p-2 gap-2 mb-[64px] md:mb-0">
              <Sidebar />
              <main className="flex-1 bg-[#121212] rounded-lg overflow-y-auto relative no-scrollbar">
                {children}
              </main>
            </div>
            <PlayerBar />
            <MobileNav />
          </LibraryProvider>
        </PlayerProvider>
      </body>
    </html>
  );
}
