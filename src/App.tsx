import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Auth/Login';
import { Signup } from './components/Auth/Signup';
import { Onboarding } from './components/Auth/Onboarding';
import { DashboardLayout } from './components/Layout/DashboardLayout';
import { Home } from './pages/Home';
import { MyRooms } from './pages/MyRooms';
import { Explore } from './pages/Explore';
import { Messages } from './pages/Messages';
import { Profile } from './pages/Profile';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [activeTab, setActiveTab] = useState<'home' | 'rooms' | 'explore' | 'messages' | 'profile'>('home');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-white text-xl">Loading Lingora...</div>
      </div>
    );
  }

  if (!user) {
    return authMode === 'login' ? (
      <Login onToggleMode={() => setAuthMode('signup')} />
    ) : (
      <Signup onToggleMode={() => setAuthMode('login')} onSuccess={() => setAuthMode('login')} />
    );
  }

  if (user && !profile) {
    return <Onboarding />;
  }

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'home' && <Home />}
      {activeTab === 'rooms' && <MyRooms />}
      {activeTab === 'explore' && <Explore />}
      {activeTab === 'messages' && <Messages />}
      {activeTab === 'profile' && <Profile />}
    </DashboardLayout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
