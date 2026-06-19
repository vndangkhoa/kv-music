import { Outlet } from 'react-router-dom';
import Header from './Header';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import PlayerBar from './PlayerBar';
import RightPanel from './RightPanel';
import AnimatedBackground from './AnimatedBackground';
import SettingsModal from './SettingsModal';
import { usePlayer } from '../context/PlayerContext';

export default function Layout() {
    const { isSettingsOpen, setIsSettingsOpen } = usePlayer();

    return (
        <div className="h-screen w-screen flex flex-col overflow-hidden bg-spotify-base text-spotify-text-main transition-colors duration-500 relative">
            <AnimatedBackground />
            
            {/* Global Header */}
            <Header />

            {/* Workspace Area */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Desktop Sidebar */}
                <Sidebar />

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto no-scrollbar pb-24 fold:pb-[90px] relative bg-spotify-base text-spotify-text-main scroll-smooth">
                    <Outlet />
                </main>

                {/* Right collapsible side panel (Up Next, Lyrics, Related) */}
                <RightPanel />
            </div>

            {/* Audio Player */}
            <PlayerBar />

            {/* Mobile Bottom Nav */}
            <BottomNav />

            {/* Settings Modal */}
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    );
}

