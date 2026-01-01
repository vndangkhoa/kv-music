"use client";

import { Play, Pause, ArrowUpDown, Clock, Music2, User } from "lucide-react";
import { useEffect, useState } from "react";
import { usePlayer } from "@/context/PlayerContext";
import Link from "next/link";
import { libraryService } from "@/services/library";
import { Track } from "@/types";
import CoverImage from "@/components/CoverImage";
import Skeleton from "@/components/Skeleton";

type SortOption = 'recent' | 'alpha-asc' | 'alpha-desc' | 'artist';

export default function Home() {
  const [timeOfDay, setTimeOfDay] = useState("Good evening");
  const [browseData, setBrowseData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [showSortMenu, setShowSortMenu] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay("Good morning");
    else if (hour < 18) setTimeOfDay("Good afternoon");
    else setTimeOfDay("Good evening");

    // Fetch Browse Content
    setLoading(true);
    libraryService.getBrowseContent()
      .then(data => {
        setBrowseData(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error fetching browse:", err);
        setLoading(false);
      });
  }, []);

  // Sort playlists based on selected option
  const sortPlaylists = (playlists: any[]) => {
    const sorted = [...playlists];
    switch (sortBy) {
      case 'alpha-asc':
        return sorted.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
      case 'alpha-desc':
        return sorted.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
      case 'artist':
        return sorted.sort((a, b) => (a.author || a.creator || '').localeCompare(b.author || b.creator || ''));
      case 'recent':
      default:
        return sorted;
    }
  };

  // Use first item of first category as Hero
  const firstCategory = Object.keys(browseData)[0];
  const heroPlaylist = firstCategory && browseData[firstCategory].length > 0 ? browseData[firstCategory][0] : null;

  const sortOptions = [
    { value: 'recent', label: 'Recently Added', icon: Clock },
    { value: 'alpha-asc', label: 'Alphabetical (A-Z)', icon: ArrowUpDown },
    { value: 'alpha-desc', label: 'Alphabetical (Z-A)', icon: ArrowUpDown },
    { value: 'artist', label: 'Artist Name', icon: User },
  ];

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-[#1e1e1e] to-[#121212] p-6 no-scrollbar pb-24">

      {/* Header / Greetings with Sort Button */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{timeOfDay}</h1>

        {/* Sort Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-[#282828] hover:bg-[#3a3a3a] rounded-full text-sm font-medium transition"
          >
            <ArrowUpDown className="w-4 h-4" />
            Sort
          </button>

          {showSortMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-[#282828] rounded-lg shadow-xl z-50 py-1 border border-[#383838]">
              {sortOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setSortBy(option.value as SortOption);
                    setShowSortMenu(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-[#3a3a3a] transition ${sortBy === option.value ? 'text-[#1DB954]' : 'text-white'}`}
                >
                  <option.icon className="w-4 h-4" />
                  {option.label}
                  {sortBy === option.value && (
                    <span className="ml-auto text-[#1DB954]">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Hero Section (Big Playlist Banner - AT THE TOP) */}
      {loading ? (
        <div className="mb-8 w-full h-80 bg-[#181818] rounded-xl flex items-center p-8 animate-pulse">
          <Skeleton className="w-56 h-56 rounded-md shadow-2xl mr-8" />
          <div className="flex-1 space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ) : heroPlaylist && (
        <Link href={`/playlist?id=${heroPlaylist.id}`}>
          <div className="mb-8 w-full h-auto md:h-80 bg-gradient-to-r from-[#2a2a2a] to-[#181818] rounded-xl flex flex-col md:flex-row items-center p-6 md:p-8 hover:bg-[#2a2a2a] transition duration-300 group cursor-pointer shadow-2xl">
            <div className="relative mb-4 md:mb-0 md:mr-8 flex-shrink-0">
              <CoverImage
                src={heroPlaylist.cover_url}
                alt={heroPlaylist.title}
                className="w-48 h-48 md:w-56 md:h-56 object-cover rounded-md shadow-2xl group-hover:scale-105 transition duration-500"
                fallbackText="VB"
              />
            </div>
            <div className="flex flex-col text-center md:text-left">
              <span className="text-xs font-bold tracking-wider uppercase mb-2">Featured Playlist</span>
              <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight">{heroPlaylist.title}</h2>
              <p className="text-[#a7a7a7] text-sm md:text-base line-clamp-2 md:line-clamp-3 max-w-2xl mb-6">
                {heroPlaylist.description}
              </p>
              <div className="mt-auto inline-flex items-center gap-2 bg-[#1DB954] text-black px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:scale-105 transition self-center md:self-start">
                <Play className="fill-black" />
                Play Now
              </div>
            </div>
          </div>
        </Link>
      )}

      {/* Made For You Section (Recommendations) */}
      <MadeForYouSection />

      {/* Artist Section (Vietnam) */}
      <ArtistVietnamSection />

      {/* Dynamic Recommended Albums based on history */}
      <RecommendedAlbumsSection />

      {/* Recently Listened */}
      <RecentlyListenedSection />

      {/* Main Browse Lists */}
      {loading ? (
        <div className="space-y-8">
          {[1, 2].map(i => (
            <div key={i}>
              <Skeleton className="h-8 w-48 mb-4" />
              <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {[1, 2, 3, 4, 5].map(j => (
                  <div key={j} className="space-y-3">
                    <Skeleton className="w-full aspect-square rounded-md" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : Object.keys(browseData).length > 0 ? (
        Object.entries(browseData).map(([category, playlists]) => (
          <div key={category} className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold capitalize hover:underline cursor-pointer">{category}</h2>
              <Link href={`/section?category=${encodeURIComponent(category)}`}>
                <span className="text-xs font-bold text-[#b3b3b3] uppercase tracking-wider hover:text-white cursor-pointer">Show all</span>
              </Link>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {sortPlaylists(playlists).slice(0, 5).map((playlist: any) => (
                <Link href={`/playlist?id=${playlist.id}`} key={playlist.id}>
                  <div className="bg-[#181818] p-4 rounded-md hover:bg-[#282828] transition duration-300 group cursor-pointer relative h-full flex flex-col">
                    <div className="relative mb-4">
                      <CoverImage
                        src={playlist.cover_url}
                        alt={playlist.title}
                        className="w-full aspect-square object-cover rounded-md shadow-lg"
                        fallbackText={playlist.title.substring(0, 2).toUpperCase()}
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
        ))
      ) : (
        <div className="text-center py-20">
          <h2 className="text-xl font-bold mb-4">Ready to explore?</h2>
          <p className="text-[#a7a7a7]">Browse content is loading or empty. Try initializing data.</p>
        </div>
      )}
    </div>
  );
}

// NEW: Recently Listened Section - Pinned to top
function RecentlyListenedSection() {
  const { playHistory, playTrack } = usePlayer();

  if (playHistory.length === 0) return null;

  return (
    <div className="mb-8 animate-in fade-in duration-300">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-5 h-5 text-[#1DB954]" />
        <h2 className="text-2xl font-bold">Recently Listened</h2>
      </div>

      {/* Horizontal Scrollable Row */}
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
        {playHistory.slice(0, 10).map((track, i) => (
          <div
            key={`${track.id}-${i}`}
            onClick={() => playTrack(track, playHistory)}
            className="flex-shrink-0 w-40 bg-[#181818] rounded-lg overflow-hidden hover:bg-[#282828] transition duration-300 group cursor-pointer"
          >
            <div className="relative">
              <CoverImage
                src={track.cover_url}
                alt={track.title}
                className="w-40 h-40 object-cover"
                fallbackText={track.title?.substring(0, 2).toUpperCase()}
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition">
                  <Play className="fill-black text-black ml-1 w-5 h-5" />
                </div>
              </div>
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm truncate">{track.title}</h3>
              <p className="text-xs text-[#a7a7a7] truncate">{track.artist}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MadeForYouSection() {
  const { playHistory, playTrack } = usePlayer();
  const [recommendations, setRecommendations] = useState<Track[]>([]);
  const [seedTrack, setSeedTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (playHistory.length > 0) {
      const seed = playHistory[0]; // Last played
      setSeedTrack(seed);
      setLoading(true);

      // Fetch actual recommendations from backend
      fetch(`/api/recommendations?seed_id=${seed.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.tracks) {
            setRecommendations(data.tracks);
          }
          setLoading(false);
        })
        .catch(err => {
          console.error("Rec error:", err);
          setLoading(false);
        });
    }
  }, [playHistory.length > 0 ? playHistory[0].id : null]);

  if (playHistory.length === 0) return null;
  if (!loading && recommendations.length === 0) return null;

  return (
    <div className="mb-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-2">
        <Music2 className="w-5 h-5 text-[#1DB954]" />
        <h2 className="text-2xl font-bold">Made For You</h2>
      </div>
      <p className="text-sm text-[#a7a7a7] mb-4">
        {seedTrack ? (
          <>Because you listened to <span className="text-white font-medium">{seedTrack.artist}</span></>
        ) : "Recommended for you"}
      </p>

      {loading ? (
        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="space-y-3">
              <Skeleton className="w-full aspect-square rounded-md" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {recommendations.slice(0, 5).map((track, i) => (
            <div key={i} onClick={() => playTrack(track, recommendations)} className="bg-[#181818] p-4 rounded-md hover:bg-[#282828] transition duration-300 group cursor-pointer relative h-full flex flex-col">
              <div className="relative mb-4">
                <CoverImage
                  src={track.cover_url}
                  alt={track.title}
                  className="w-full aspect-square object-cover rounded-md shadow-lg"
                  fallbackText={track.title?.substring(0, 2).toUpperCase()}
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
      )}
    </div>
  );
}

function RecommendedAlbumsSection() {
  const { playHistory } = usePlayer();
  const [albums, setAlbums] = useState<any[]>([]);
  const [seedArtist, setSeedArtist] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (playHistory.length > 0) {
      const artist = playHistory[0].artist;
      if (!artist) return;

      // Clean artist name (remove delimiters like commas if multiple)
      const primaryArtist = artist.split(',')[0].trim();
      setSeedArtist(primaryArtist);
      setLoading(true);

      fetch(`/api/recommendations/albums?seed_artist=${encodeURIComponent(primaryArtist)}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data)) setAlbums(data);
          setLoading(false);
        })
        .catch(err => {
          console.error("Album Rec error:", err);
          setLoading(false);
        });
    }
  }, [playHistory.length > 0 ? playHistory[0].artist : null]);

  if (playHistory.length === 0) return null;
  if (!loading && albums.length === 0) return null;

  return (
    <div className="mb-8 animate-in fade-in duration-700">
      <h2 className="text-2xl font-bold mb-2">More from {seedArtist}</h2>
      <p className="text-sm text-[#a7a7a7] mb-4">Albums you might like</p>

      {loading ? (
        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="space-y-3">
              <Skeleton className="w-full aspect-square rounded-md" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {albums.slice(0, 5).map((album, i) => (
            <Link href={`/playlist?id=${album.id}`} key={i}>
              <div className="bg-[#181818] p-4 rounded-md hover:bg-[#282828] transition duration-300 group cursor-pointer relative h-full flex flex-col">
                <div className="relative mb-4">
                  <CoverImage
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
      )}
    </div>
  );
}

// NEW: Artist Vietnam Section with dynamic photos
function ArtistVietnamSection() {
  // Popular Vietnamese artists
  const artistNames = [
    "Sơn Tùng M-TP",
    "HIEUTHUHAI",
    "Đen Vâu",
    "Hoàng Dũng",
    "Vũ.",
    "MONO",
    "Tlinh",
    "Erik",
  ];

  const [artistPhotos, setArtistPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch artist photos from API
    const fetchArtistPhotos = async () => {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const photos: Record<string, string> = {};

      await Promise.all(
        artistNames.map(async (name) => {
          try {
            const res = await fetch(`${apiUrl}/api/artist/info?name=${encodeURIComponent(name)}`);
            if (res.ok) {
              const data = await res.json();
              if (data.photo) {
                photos[name] = data.photo;
              }
            }
          } catch (e) {
            console.error(`Failed to fetch photo for ${name}:`, e);
          }
        })
      );

      setArtistPhotos(photos);
      setLoading(false);
    };

    fetchArtistPhotos();
  }, []);

  return (
    <div className="mb-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 mb-4">
        <User className="w-5 h-5 text-[#1DB954]" />
        <h2 className="text-2xl font-bold">Artist Vietnam</h2>
      </div>
      <p className="text-sm text-[#a7a7a7] mb-4">Popular Vietnamese artists</p>

      {/* Horizontal Scrollable Row */}
      <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
        {loading ? (
          // Skeleton Row
          [1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex-shrink-0 w-36 text-center space-y-3">
              <Skeleton className="w-36 h-36 rounded-full" />
              <Skeleton className="h-4 w-3/4 mx-auto" />
            </div>
          ))
        ) : (
          artistNames.map((name, i) => (
            <Link href={`/artist?name=${encodeURIComponent(name)}`} key={i}>
              <div className="flex-shrink-0 w-36 text-center group cursor-pointer">
                <div className="relative mb-3">
                  <CoverImage
                    src={artistPhotos[name]}
                    alt={name}
                    className="w-36 h-36 rounded-full object-cover shadow-lg group-hover:shadow-xl transition"
                    fallbackText={name.substring(0, 2).toUpperCase()}
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition rounded-full flex items-center justify-center">
                    <div className="w-12 h-12 bg-[#1DB954] rounded-full flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition">
                      <Play className="fill-black text-black ml-1 w-5 h-5" />
                    </div>
                  </div>
                </div>
                <h3 className="font-bold text-sm truncate px-2">{name}</h3>
                <p className="text-xs text-[#a7a7a7]">Artist</p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}

