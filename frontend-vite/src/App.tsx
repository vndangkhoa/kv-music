import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Discovery from './pages/Discovery';
import Search from './pages/Search';
import Library from './pages/Library';
import Playlist from './pages/Playlist';
import Artist from './pages/Artist';
import Album from './pages/Album';
import Collection from './pages/Collection';
import Section from './pages/Section';
import { useEffect } from 'react';
import { useLibraryStore } from './stores/libraryStore';
import { usePlayerStore } from './stores/playerStore';

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
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Discovery />} />
          <Route path="search" element={<Search />} />
          <Route path="library" element={<Library />} />
          <Route path="explore" element={<Navigate to="/" replace />} />
          <Route path="playlist/:id" element={<Playlist />} />
          <Route path="album/:id" element={<Album />} />
          <Route path="artist/:id" element={<Artist />} />
          <Route path="collection/tracks" element={<Collection />} />
          <Route path="section" element={<Section />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
