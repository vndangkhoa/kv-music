import { Home, Compass, Library } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';

export default function BottomNav() {
    const location = useLocation();
    const path = location.pathname;

    const tabs = [
        { name: 'Home', icon: Home, path: '/' },
        { name: 'Explore', icon: Compass, path: '/explore' },
        { name: 'Library', icon: Library, path: '/library' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/95 backdrop-blur-xl border-t border-white/5 pb-safe md:hidden z-50">
            <div className="flex justify-around items-center h-16 px-2">
                {tabs.map((tab) => {
                    const isActive = path === tab.path;
                    return (
                        <Link
                            key={tab.name}
                            to={tab.path}
                            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
                                isActive ? 'text-white' : 'text-neutral-500 active:text-neutral-300'
                            }`}
                        >
                            <tab.icon className="w-6 h-6 mb-1" strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] uppercase font-medium tracking-wide">{tab.name}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
