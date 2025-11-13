import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Logo } from '../components/layout/Logo';
import { LogOut } from 'lucide-react';

export default function Home() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-lg">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Logo />
          
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <p className="text-white/60">Welcome back,</p>
              <p className="text-white">{user?.name}</p>
            </div>
            
            <Button
              onClick={logout}
              variant="outline"
              className="bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl mb-4">Welcome to BFFlix! 🎬</h1>
          <p className="text-white/70 text-lg mb-8">
            Your social platform for discovering movies and shows through circles.
          </p>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Placeholder Cards */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
              <h3 className="text-xl mb-2">My Circles</h3>
              <p className="text-white/60 text-sm">
                Join circles to get personalized movie recommendations from your friends.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
              <h3 className="text-xl mb-2">Trending</h3>
              <p className="text-white/60 text-sm">
                See what's popular among your circles and discover new content.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
              <h3 className="text-xl mb-2">Watchlist</h3>
              <p className="text-white/60 text-sm">
                Save movies and shows recommended by your friends to watch later.
              </p>
            </div>
          </div>

          <div className="mt-12 bg-gradient-to-r from-red-600/10 to-pink-600/10 border border-red-600/20 rounded-xl p-6">
            <h2 className="text-2xl mb-2">Coming Soon</h2>
            <p className="text-white/70">
              This is a placeholder home page. More features and pages will be added as you build out BFFlix!
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}