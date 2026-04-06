import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, Language, UserLanguage } from '../lib/supabase';
import { User, Globe, LogOut } from 'lucide-react';

const LEVEL_COLORS = {
  beginner: 'bg-green-500',
  intermediate: 'bg-blue-500',
  advanced: 'bg-purple-500',
};

const NATIVE_LANGUAGE_OPTIONS = [
  { code: 'en', name: 'English', emoji: '🇬🇧' },
  { code: 'es', name: 'Spanish', emoji: '🇪🇸' },
  { code: 'fr', name: 'French', emoji: '🇫🇷' },
  { code: 'de', name: 'German', emoji: '🇩🇪' },
  { code: 'it', name: 'Italian', emoji: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', emoji: '🇵🇹' },
  { code: 'ja', name: 'Japanese', emoji: '🇯🇵' },
  { code: 'zh', name: 'Chinese', emoji: '🇨🇳' },
  { code: 'ko', name: 'Korean', emoji: '🇰🇷' },
  { code: 'ru', name: 'Russian', emoji: '🇷🇺' },
  { code: 'ar', name: 'Arabic', emoji: '🇸🇦' },
  { code: 'hi', name: 'Hindi', emoji: '🇮🇳' },
  { code: 'ur', name: 'Urdu', emoji: '🇵🇰' },
  { code: 'bn', name: 'Bengali', emoji: '🇧🇩' },
  { code: 'id', name: 'Indonesian', emoji: '🇮🇩' },
  { code: 'nl', name: 'Dutch', emoji: '🇳🇱' },
  { code: 'pl', name: 'Polish', emoji: '🇵🇱' },
  { code: 'sv', name: 'Swedish', emoji: '🇸🇪' },
  { code: 'el', name: 'Greek', emoji: '🇬🇷' },
  { code: 'he', name: 'Hebrew', emoji: '🇮🇱' },
];

export function Profile() {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [nativeLanguage, setNativeLanguage] = useState(profile?.native_language || '');
  const [userLanguages, setUserLanguages] = useState<(UserLanguage & { language: Language })[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name);
      setNativeLanguage(profile.native_language);
    }
    fetchUserLanguages();
  }, [profile]);

  const fetchUserLanguages = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_languages')
      .select('*, language:languages(*)')
      .eq('user_id', user.id);

    if (data) {
      setUserLanguages(data as (UserLanguage & { language: Language })[]);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        native_language: nativeLanguage,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      setMessage('Failed to update profile');
    } else {
      setMessage('Profile updated successfully!');
      await refreshProfile();
    }

    setLoading(false);

    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Your Profile</h1>
        <p className="text-gray-400 text-sm md:text-base">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-4 md:gap-6">
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 md:gap-6 mb-4 md:mb-6">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-[#7c3aed] object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#14b8a6] flex items-center justify-center flex-shrink-0">
                <User className="w-10 h-10 md:w-12 md:h-12 text-white" />
              </div>
            )}
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl font-bold text-white truncate">{profile?.display_name}</h2>
              <p className="text-gray-400 text-sm md:text-base">Member since {new Date(profile?.created_at || '').toLocaleDateString()}</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-2">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-3 md:px-4 py-2 md:py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm md:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent transition"
              />
            </div>

            <div>
              <label htmlFor="nativeLanguage" className="block text-sm font-medium text-gray-300 mb-2">
                Native Language
              </label>
              <select
                id="nativeLanguage"
                value={nativeLanguage}
                onChange={(e) => setNativeLanguage(e.target.value)}
                required
                className="w-full px-3 md:px-4 py-2 md:py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent transition"
              >
                {NATIVE_LANGUAGE_OPTIONS.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-[#0f172a]">
                    {lang.emoji} {lang.name}
                  </option>
                ))}
              </select>
            </div>

            {message && (
              <div className={`${message.includes('success') ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} border rounded-lg p-3`}>
                <p className="text-xs md:text-sm">{message}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 md:py-3 px-4 bg-gradient-to-r from-[#7c3aed] to-[#14b8a6] text-white font-medium rounded-lg text-sm md:text-base hover:shadow-lg hover:shadow-[#7c3aed]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-4 md:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-6 h-6 text-[#14b8a6]" />
            <h3 className="text-lg md:text-xl font-bold text-white">Languages Learning</h3>
          </div>

          {userLanguages.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm md:text-base">
              You're not learning any languages yet. Go to Explore to add languages!
            </p>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {userLanguages.map((ul) => (
                <div
                  key={ul.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-3 md:p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl flex-shrink-0">{ul.language.flag_emoji}</span>
                    <div className="min-w-0">
                      <h4 className="text-white font-medium text-sm md:text-base truncate">{ul.language.name}</h4>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium text-white ${
                          LEVEL_COLORS[ul.proficiency_level]
                        }`}
                      >
                        {ul.proficiency_level}
                      </span>
                    </div>
                  </div>
                  <div className="text-gray-400 text-xs md:text-sm">
                    Started {new Date(ul.created_at).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-bold text-white mb-4">Account</h3>
          <button
            onClick={() => signOut()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 md:py-3 bg-red-500/10 border border-red-500/20 text-red-400 font-medium rounded-lg text-sm md:text-base hover:bg-red-500/20 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
