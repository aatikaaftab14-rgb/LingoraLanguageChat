import { useState, useEffect } from 'react';
import { supabase, Language, UserLanguage } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Check, Search } from 'lucide-react';

const LEVEL_COLORS = {
  beginner: 'bg-emerald-500',
  intermediate: 'bg-blue-500',
  advanced: 'bg-orange-500',
};

export function Explore() {
  const { user, refreshProfile } = useAuth();
  const [languages, setLanguages] = useState<Language[]>([]);
  const [userLanguages, setUserLanguages] = useState<UserLanguage[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<'beginner' | 'intermediate' | 'advanced'>(
    'beginner'
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLanguages();
    fetchUserLanguages();
  }, [user]);

  const fetchLanguages = async () => {
    const { data } = await supabase.from('languages').select('*').order('name');
    if (data) setLanguages(data);
  };

  const fetchUserLanguages = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('user_languages')
      .select('*')
      .eq('user_id', user.id);
    if (data) setUserLanguages(data);
  };

  const isLanguageLearning = (languageId: string) => {
    return userLanguages.some((ul) => ul.language_id === languageId);
  };

  const addLanguage = async () => {
    if (!selectedLanguage || !user || loading) return;

    if (userLanguages.length >= 5) {
      alert('You can only learn up to 5 languages at a time');
      return;
    }

    setLoading(true);

    const { error } = await supabase.from('user_languages').insert({
      user_id: user.id,
      language_id: selectedLanguage.id,
      proficiency_level: selectedLevel,
    });

    if (!error) {
      await fetchUserLanguages();
      await refreshProfile();
      setSelectedLanguage(null);
    }

    setLoading(false);
  };

  const removeLanguage = async (languageId: string) => {
    if (!user || loading) return;

    setLoading(true);

    const { error } = await supabase
      .from('user_languages')
      .delete()
      .eq('user_id', user.id)
      .eq('language_id', languageId);

    if (!error) {
      await fetchUserLanguages();
      await refreshProfile();
    }

    setLoading(false);
  };

  const filteredLanguages = languages.filter((lang) =>
    lang.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8 pb-24 md:pb-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Explore Languages</h1>
        <p className="text-gray-400">Browse and join language rooms ({userLanguages.length}/5 selected)</p>
      </div>

      <div className="mb-4 md:mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search languages..."
            className="w-full pl-12 pr-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white text-sm md:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
          />
        </div>
      </div>

      <div className="grid gap-4 md:gap-6">
        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 md:p-7">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4">Your Languages</h2>
          {userLanguages.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-400">You haven't selected any languages yet. Browse below to get started!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              {userLanguages.map((ul) => {
                const lang = languages.find((l) => l.id === ul.language_id);
                if (!lang) return null;
                return (
                  <div
                    key={ul.id}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl flex-shrink-0">{lang.flag_emoji}</span>
                      <div className="min-w-0">
                        <h3 className="text-white font-medium truncate">{lang.name}</h3>
                        <span
                          className={`inline-block px-2 py-1 rounded-md text-xs font-medium text-white ${
                            LEVEL_COLORS[ul.proficiency_level]
                          }`}
                        >
                          {ul.proficiency_level}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => removeLanguage(lang.id)}
                      disabled={loading}
                      className="text-red-400 hover:text-red-300 text-sm font-medium disabled:opacity-50 whitespace-nowrap flex-shrink-0"
                    >
                      Remove
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 md:p-7">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4">All Languages</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
            {filteredLanguages.map((lang) => {
              const isLearning = isLanguageLearning(lang.id);
              return (
                <button
                  key={lang.id}
                  onClick={() => !isLearning && setSelectedLanguage(lang)}
                  disabled={isLearning || userLanguages.length >= 5}
                  className={`p-4 rounded-xl border transition-all text-left ${
                    isLearning
                      ? 'bg-emerald-500/10 border-emerald-500/30 cursor-default'
                      : selectedLanguage?.id === lang.id
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : 'bg-white/[0.04] border-white/[0.08] hover:border-blue-500/30'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl flex-shrink-0">{lang.flag_emoji}</span>
                    <span className="text-white font-medium truncate">{lang.name}</span>
                    {isLearning && <Check className="w-5 h-5 text-emerald-400 ml-auto flex-shrink-0" />}
                    {!isLearning && selectedLanguage?.id === lang.id && (
                      <Plus className="w-5 h-5 text-blue-400 ml-auto flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedLanguage && (
          <div className="bg-gradient-to-br from-blue-500/10 to-emerald-500/10 border border-blue-500/20 rounded-2xl p-5 md:p-7">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">{selectedLanguage.flag_emoji}</span>
              <span className="truncate">Add {selectedLanguage.name}</span>
            </h3>
            <p className="text-gray-300 mb-4">Choose your proficiency level:</p>
            <div className="grid grid-cols-3 gap-2 md:gap-3 mb-4">
              {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedLevel(level)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    selectedLevel === level
                      ? level === 'beginner'
                        ? 'bg-emerald-500 text-white'
                        : level === 'intermediate'
                        ? 'bg-blue-500 text-white'
                        : 'bg-orange-500 text-white'
                      : 'bg-white/[0.06] text-gray-400 hover:bg-white/[0.1]'
                  }`}
                >
                  {level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setSelectedLanguage(null)}
                className="px-4 md:px-6 py-3 bg-white/[0.06] border border-white/[0.1] text-white font-medium rounded-xl hover:bg-white/[0.1] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={addLanguage}
                disabled={loading}
                className="px-4 md:px-6 py-3 bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Adding...' : 'Add Language'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
