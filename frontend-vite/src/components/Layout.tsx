import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import PlayerBar from './PlayerBar';
import AnimatedBackground from './AnimatedBackground';

export default function Layout() {
    return (
        <div className="h-screen w-screen flex overflow-hidden bg-spotify-base text-spotify-text-main transition-colors duration-500 relative">
            <AnimatedBackground />
            {/* Desktop Sidebar */}
            <Sidebar />

            {/* Main Content Area - YouTube Music Style (Pure Black with subtle top fade) */}
            <main className="flex-1 overflow-y-auto pb-24 fold:pb-[90px] relative bg-spotify-base text-spotify-text-main scroll-smooth">
                <Outlet />
            </main>

            {/* Audio Player */}
            <PlayerBar />

            {/* Mobile Bottom Nav */}
            <BottomNav />
        </div>
    );
}

