import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import AppLayout from './components/layout/AppLayout';
import { useLibraryStore } from './stores/libraryStore';
import { usePlayerStore } from './stores/playerStore';

// Route-level code splitting: each page becomes its own chunk so the initial
// bundle (first paint) stays small. Discovery is eager (landing page),
// everything else loads on navigation with a lightweight fallback.
const Discovery = lazy(() => import('./pages/Discovery'));
const Search = lazy(() => import('./pages/Search'));
const Library = lazy(() => import('./pages/Library'));
const Playlist = lazy(() => import('./pages/Playlist'));
const Artist = lazy(() => import('./pages/Artist'));
const Album = lazy(() => import('./pages/Album'));
const Collection = lazy(() => import('./pages/Collection'));
const Section = lazy(() => import('./pages/Section'));
const ChartsSection = lazy(() => import('./pages/ChartsSection'));
const ArtistsPage = lazy(() => import('./pages/ArtistsPage'));
const Feed = lazy(() => import('./pages/Feed'));
const Profile = lazy(() => import('./pages/Profile'));
const Track = lazy(() => import('./pages/Track'));

function PageFallback() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 p-8 bg-[#121212]" aria-busy="true">
      <div className="w-10 h-10 rounded-full border-2 border-[#ff5500] border-t-transparent animate-spin" />
      <p className="text-neutral-500 text-xs font-semibold">Loading page…</p>
    </div>
  );
}

function App() {
  const refreshLibrary = useLibraryStore(s => s.refreshLibrary);
  const deriveSavedAlbums = useLibraryStore(s => s.deriveSavedAlbums);
  const playHistory = usePlayerStore(s => s.playHistory);

  useEffect(() => {
    refreshLibrary();
  }, [refreshLibrary]);

  useEffect(() => {
    deriveSavedAlbums(playHistory);
  }, [playHistory, deriveSavedAlbums]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Discovery />} />
            <Route path="search" element={<Search />} />
            <Route path="library" element={<Library />} />
            <Route path="explore" element={<Navigate to="/" replace />} />
            <Route path="feed" element={<Feed />} />
            <Route path="profile" element={<Profile />} />
            <Route path="playlist/:id" element={<Playlist />} />
            <Route path="album/:id" element={<Album />} />
            <Route path="artist/:id" element={<Artist />} />
            <Route path="artists" element={<ArtistsPage />} />
            <Route path="collection/tracks" element={<Collection />} />
            <Route path="section" element={<Section />} />
            <Route path="charts" element={<ChartsSection />} />
            <Route path="track/:id" element={<Track />} />
            <Route path="share/track/:id" element={<Track />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
