import { ReactNode } from 'react';
import { Home, MessageSquare, Search, Mail, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

type Tab = 'home' | 'rooms' | 'explore' | 'messages' | 'profile';

type Props = {
  children: ReactNode;
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

export function DashboardLayout({ children, activeTab, onTabChange }: Props) {
  const { profile, signOut } = useAuth();

  const navItems = [
    { id: 'home' as Tab, icon: Home, label: 'Home' },
    { id: 'rooms' as Tab, icon: MessageSquare, label: 'Rooms' },
    { id: 'explore' as Tab, icon: Search, label: 'Explore' },
    { id: 'messages' as Tab, icon: Mail, label: 'Chat' },
    { id: 'profile' as Tab, icon: User, label: 'Profile' },
  ];

  return (
    <div className="h-screen bg-gradient-to-br from-[#0a0f1e] via-[#0f172a] to-[#1a1f35] flex overflow-hidden">
      <aside className="hidden lg:flex lg:w-72 bg-gradient-to-b from-white/[0.07] to-white/[0.03] backdrop-blur-xl border-r border-white/[0.08] flex-col">
        <div className="p-8 border-b border-white/[0.08]">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Lingora</h1>
          <p className="text-gray-400 text-sm mt-1">Language Practice</p>
        </div>

        <nav className="flex-1 p-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-xl transition-all duration-200 ${
                  activeTab === item.id
                    ? 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white shadow-lg shadow-blue-500/25'
                    : 'text-gray-400 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-6 border-t border-white/[0.08]">
          <div className="flex items-center gap-3 mb-4">
            {profile?.avatar_url && (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-11 h-11 rounded-full object-cover ring-2 ring-blue-500/30"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{profile?.display_name}</p>
              <p className="text-emerald-400 text-xs flex items-center gap-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                Online
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-gray-400 hover:text-white hover:bg-white/[0.06] rounded-xl transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">{children}</main>

        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[#0a0f1e] to-[#0f172a]/95 backdrop-blur-xl border-t border-white/[0.08] flex justify-around px-2 py-2 z-50">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all flex-1 max-w-[80px] ${
                  activeTab === item.id
                    ? 'text-blue-400'
                    : 'text-gray-500 active:scale-95'
                }`}
              >
                <Icon className={`w-6 h-6 ${activeTab === item.id ? 'drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]' : ''}`} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
