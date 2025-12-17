"use client";

import { Play, Pause } from "lucide-react";
import { useEffect, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import Link from "next/link";
import { libraryService } from "@/services/library";

export default function Home() {
  const [timeOfDay, setTimeOfDay] = useState("Good evening");
  const [browseData, setBrowseData] = useState<Record<string, any[]>>({});

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay("Good morning");
    else if (hour < 18) setTimeOfDay("Good afternoon");
    else setTimeOfDay("Good evening");

    // Fetch Browse Content
    libraryService.getBrowseContent()
      .then(data => setBrowseData(data))
      .catch(err => console.error("Error fetching browse:", err));
  }, []);

  // Use first item of first category as Hero
  const firstCategory = Object.keys(browseData)[0];
  const heroPlaylist = firstCategory && browseData[firstCategory].length > 0 ? browseData[firstCategory][0] : null;

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-[#1e1e1e] to-[#121212] p-6 no-scrollbar pb-24">

      {/* Header / Greetings */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{timeOfDay}</h1>
      </div>

      {/* Hero Section (First Playlist) */}
      {heroPlaylist && (
        <Link href={`/playlist?id=${heroPlaylist.id}`}>
          <div className="flex flex-col md:flex-row gap-6 mb-8 hover:bg-white/10 p-4 rounded-md transition group cursor-pointer items-center md:items-end text-center md:text-left">
            <img
              src={heroPlaylist.cover_url || "https://placehold.co/200"}
              alt={heroPlaylist.title}
              className="w-48 h-48 md:w-60 md:h-60 shadow-2xl object-cover rounded-md"
            />
            <div className="flex flex-col justify-end w-full">
              <p className="text-xs font-bold uppercase tracking-widest mb-2 hidden md:block">Playlist</p>
              <h2 className="text-3xl md:text-6xl font-bold mb-2 md:mb-4 line-clamp-2">{heroPlaylist.title}</h2>
              <p className="text-sm font-medium mb-4 text-[#a7a7a7] line-clamp-2">{heroPlaylist.description}</p>
              <div className="flex items-center justify-center md:justify-start gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-[#1DB954] rounded-full flex items-center justify-center hover:scale-105 transition shadow-lg">
                  <Play className="fill-black text-black ml-1 w-5 h-5 md:w-6 md:h-6" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Made For You (Recommendations) */}
      <MadeForYouSection />

      {/* Recommended Albums */}
      <RecommendedAlbumsSection />

      {/* Render Categories */}
      {Object.entries(browseData).map(([category, playlists]) => (
        <div key={category} className="mb-8">
          <h2 className="text-2xl font-bold mb-4 hover:underline cursor-pointer">{category}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {playlists.slice(0, 5).map((playlist) => (
              <Link href={`/playlist?id=${playlist.id}`} key={playlist.id}>
                <div className="bg-[#181818] p-4 rounded-md hover:bg-[#282828] transition duration-300 group cursor-pointer relative h-full flex flex-col">
                  <div className="relative mb-4">
                    <img
                      src={playlist.cover_url || "https://placehold.co/200"}
                      alt={playlist.title}
                      className="w-full aspect-square object-cover rounded-md shadow-lg"
                    />
                    <div className="absolute bottom-2 right-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition duration-300 shadow-xl">
                      <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center hover:scale-105">
                        <Play className="fill-black text-black ml-1" />
                      </div>
                    </div>
                  </div>
                  <h3 className="font-bold mb-1 truncate">{playlist.title}</h3>
                  <p className="text-sm text-[#a7a7a7] line-clamp-2">{playlist.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MadeForYouSection() {
  const { playHistory, playTrack } = usePlayer();
  const [recommendations, setRecommendations] = useState<any[]>([]);

  useEffect(() => {
    if (playHistory.length > 0) {
      const seed = playHistory[0]; // Last played
      libraryService.getRecommendations(seed.id)
        .then(tracks => setRecommendations(tracks))
        .catch(err => console.error("Rec error:", err));
    }
  }, [playHistory.length > 0 ? playHistory[0].id : null]);

  if (playHistory.length === 0 || recommendations.length === 0) return null;

  return (
    <div className="mb-8 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold mb-4">Made For You</h2>
      <p className="text-sm text-[#a7a7a7] mb-4">Based on your listening of <span className="text-white font-medium">{playHistory[0].title}</span></p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {recommendations.slice(0, 5).map((track, i) => (
          <div key={i} onClick={() => playTrack(track, recommendations)} className="bg-[#181818] p-4 rounded-md hover:bg-[#282828] transition duration-300 group cursor-pointer relative h-full flex flex-col">
            <div className="relative mb-4">
              <img
                src={track.cover_url}
                alt={track.title}
                className="w-full aspect-square object-cover rounded-md shadow-lg"
              />
              <div className="absolute bottom-2 right-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition duration-300 shadow-xl">
                <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center hover:scale-105">
                  <Play className="fill-black text-black ml-1" />
                </div>
              </div>
            </div>
            <h3 className="font-bold mb-1 truncate">{track.title}</h3>
            <p className="text-sm text-[#a7a7a7] line-clamp-2">{track.artist}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecommendedAlbumsSection() {
  const { playHistory } = usePlayer();
  const [albums, setAlbums] = useState<any[]>([]);

  useEffect(() => {
    if (playHistory.length > 0) {
      const seedArtist = playHistory[0].artist; // Last played artist
      if (!seedArtist) return;

      // Clean artist name (remove delimiters like commas if multiple)
      const primaryArtist = seedArtist.split(',')[0].trim();

      libraryService.getRecommendedAlbums(primaryArtist)
        .then(data => {
          if (Array.isArray(data)) setAlbums(data);
        })
        .catch(err => console.error("Album Rec error:", err));
    }
  }, [playHistory.length > 0 ? playHistory[0].artist : null]);

  if (playHistory.length === 0 || albums.length === 0) return null;

  return (
    <div className="mb-8 animate-in fade-in duration-700">
      <h2 className="text-2xl font-bold mb-4">Recommended Albums</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {albums.slice(0, 5).map((album, i) => (
          <Link href={`/playlist?id=${album.id}`} key={i}>
            <div className="bg-[#181818] p-4 rounded-md hover:bg-[#282828] transition duration-300 group cursor-pointer relative h-full flex flex-col">
              <div className="relative mb-4">
                <img
                  src={album.cover_url}
                  alt={album.title}
                  className="w-full aspect-square object-cover rounded-md shadow-lg"
                />
                <div className="absolute bottom-2 right-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition duration-300 shadow-xl">
                  <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center hover:scale-105">
                    <Play className="fill-black text-black ml-1" />
                  </div>
                </div>
              </div>
              <h3 className="font-bold mb-1 truncate">{album.title}</h3>
              <p className="text-sm text-[#a7a7a7] line-clamp-2">{album.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
