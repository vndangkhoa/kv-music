import { Home, Search, Library } from 'lucide-react';
import { useLocation, Link } from 'react-router-dom';

export default function BottomNav() {
    const location = useLocation();
    const path = location.pathname;

    const tabs = [
        { name: 'Home', icon: Home, path: '/' },
        { name: 'Search', icon: Search, path: '/search' },
        { name: 'Library', icon: Library, path: '/library' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-neutral-900 border-t border-neutral-800 pb-safe md:hidden z-50">
            <div className="flex justify-around items-center h-16">
                {tabs.map((tab) => {
                    const isActive = path === tab.path;
                    return (
                        <Link
                            key={tab.name}
                            to={tab.path}
                            className={`flex flex-col items-center justify-center w-full h-full transition-colors ${isActive ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
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
