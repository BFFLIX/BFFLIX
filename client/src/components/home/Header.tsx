import { ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Logo } from '../layout/Logo';

interface HeaderProps {
  userName: string;
  userAvatar?: string;
  onLogout: () => void;
}

export function Header({ userName, userAvatar, onLogout }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-black/80 backdrop-blur-xl border-b border-white/10">
      <div className="h-full px-6 flex items-center justify-between">
        {/* Left: Logo */}
        <div className="flex items-center gap-3">
          <Logo className="h-10 w-auto" />
        </div>

        {/* Center: Page Title */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <h1 className="text-white/90">Home</h1>
        </div>

        {/* Right: User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 hover:bg-white/5 rounded-lg px-3 py-2 transition-colors">
            <Avatar className="h-8 w-8">
              <AvatarImage src={userAvatar} />
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-pink-600 text-white">
                {userName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-white/90 text-sm">{userName}</span>
            <ChevronDown className="w-4 h-4 text-white/60" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-zinc-900 border-white/10 text-white">
            <DropdownMenuItem className="cursor-pointer hover:bg-white/5">
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer hover:bg-white/5">
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem 
              className="cursor-pointer hover:bg-white/5 text-red-400"
              onClick={onLogout}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}