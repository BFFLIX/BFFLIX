import { Home, Users, Video, Bot, User, LogOut } from 'lucide-react';
import { cn } from '../../lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface LeftSidebarProps {
  activeItem: string;
  onItemClick: (id: string) => void;
  onLogout: () => void;
}

const navItems: NavItem[] = [
  { id: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
  { id: 'circles', label: 'Circles', icon: <Users className="w-5 h-5" /> },
  { id: 'viewings', label: 'Viewings', icon: <Video className="w-5 h-5" /> },
  { id: 'ai', label: 'AI Assistant', icon: <Bot className="w-5 h-5" /> },
  { id: 'profile', label: 'Profile', icon: <User className="w-5 h-5" /> },
];

export function LeftSidebar({ activeItem, onItemClick, onLogout }: LeftSidebarProps) {
  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 p-6">
      <nav className="flex flex-col h-full">
        {/* Navigation Items */}
        <div className="space-y-2 flex-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onItemClick(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                activeItem === item.id
                  ? 'bg-gradient-to-r from-red-600/20 to-pink-600/20 text-white border border-red-600/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              )}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Logout Button at Bottom */}
        <button
          onClick={onLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/50 hover:text-red-400 hover:bg-white/5 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span>Log out</span>
        </button>
      </nav>
    </aside>
  );
}
