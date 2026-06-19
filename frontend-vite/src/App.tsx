import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Search from './pages/Search';
import Explore from './pages/Explore';
import Library from './pages/Library';
import Playlist from './pages/Playlist';
import Artist from './pages/Artist';
import Album from './pages/Album';
import Collection from './pages/Collection';
import Section from './pages/Section';

import { PlayerProvider } from './context/PlayerContext';
import { LibraryProvider } from './context/LibraryContext';
import { AuthProvider } from './context/AuthContext';
import { LayoutProvider } from './context/LayoutContext';
import AnimatedBackground from './components/AnimatedBackground';

// Force HMR Remount (v7)
function App() {
    return (
        <AuthProvider>
            <PlayerProvider>
                <AnimatedBackground />
                <LibraryProvider>
                <LayoutProvider>
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                    <Routes>
                        <Route path="/" element={<Layout />}>
                            <Route index element={<Home />} />
                            <Route path="search" element={<Search />} />
                            <Route path="explore" element={<Explore />} />
                            <Route path="library" element={<Library />} />
                            <Route path="playlist/:id" element={<Playlist />} />
                            <Route path="artist/:id" element={<Artist />} />
                            <Route path="album/:id" element={<Album />} />
                            <Route path="collection/tracks" element={<Collection />} />
                            <Route path="section" element={<Section />} />
                        </Route>
                    </Routes>
                </BrowserRouter>
                </LayoutProvider>
                </LibraryProvider>
            </PlayerProvider>
        </AuthProvider>
    );
}

export default App;
