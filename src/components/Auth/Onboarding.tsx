import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, Language } from '../../lib/supabase';
import { Globe, Check, ChevronRight } from 'lucide-react';

const AVATAR_OPTIONS = [
  'https://images.pexels.com/photos/1542085/pexels-photo-1542085.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/1516680/pexels-photo-1516680.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/1310522/pexels-photo-1310522.jpeg?auto=compress&cs=tinysrgb&w=200',
  'https://images.pexels.com/photos/1484794/pexels-photo-1484794.jpeg?auto=compress&cs=tinysrgb&w=200',
];

const COMMON_LANGUAGES = [
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

type SelectedLanguage = {
  languageId: string;
  level: 'beginner' | 'intermediate' | 'advanced';
};

export function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const [step, setStep] = useState(1);
  const [displayName, setDisplayName] = useState('');
  const [nativeLanguage, setNativeLanguage] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATAR_OPTIONS[0]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<SelectedLanguage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLanguages();
  }, []);

  const fetchLanguages = async () => {
    const { data } = await supabase
      .from('languages')
      .select('*')
      .order('name');

    if (data) {
      setLanguages(data);
    }
  };

  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (displayName && nativeLanguage) {
      setStep(2);
    }
  };

  const toggleLanguage = (languageId: string) => {
    const exists = selectedLanguages.find((l) => l.languageId === languageId);
    if (exists) {
      setSelectedLanguages(selectedLanguages.filter((l) => l.languageId !== languageId));
    } else if (selectedLanguages.length < 5) {
      setSelectedLanguages([...selectedLanguages, { languageId, level: 'beginner' }]);
    }
  };

  const updateLevel = (languageId: string, level: 'beginner' | 'intermediate' | 'advanced') => {
    setSelectedLanguages(
      selectedLanguages.map((l) => (l.languageId === languageId ? { ...l, level } : l))
    );
  };

  const handleFinish = async () => {
    if (selectedLanguages.length === 0) {
      setError('Please select at least one language');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: user?.id,
        display_name: displayName,
        native_language: nativeLanguage,
        avatar_url: selectedAvatar,
      });

      if (profileError) throw profileError;

      const userLanguagesData = selectedLanguages.map((sl) => ({
        user_id: user?.id,
        language_id: sl.languageId,
        proficiency_level: sl.level,
      }));

      const { error: languagesError } = await supabase
        .from('user_languages')
        .insert(userLanguagesData);

      if (languagesError) throw languagesError;

      await refreshProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#7c3aed] to-[#14b8a6] rounded-full mb-4 shadow-lg shadow-[#7c3aed]/50">
            <Globe className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Complete your profile</h1>
          <p className="text-gray-400">
            Step {step} of 2 - {step === 1 ? 'Basic Information' : 'Language Selection'}
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 shadow-2xl">
          {step === 1 && (
            <form onSubmit={handleStep1Submit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Choose your avatar
                </label>
                <div className="grid grid-cols-6 gap-3">
                  {AVATAR_OPTIONS.map((avatar) => (
                    <button
                      key={avatar}
                      type="button"
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`relative aspect-square rounded-full overflow-hidden border-2 transition-all ${
                        selectedAvatar === avatar
                          ? 'border-[#7c3aed] ring-2 ring-[#7c3aed]/50'
                          : 'border-white/10 hover:border-[#14b8a6]'
                      }`}
                    >
                      <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                      {selectedAvatar === avatar && (
                        <div className="absolute inset-0 bg-[#7c3aed]/30 flex items-center justify-center">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

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
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent transition"
                  placeholder="How should we call you?"
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
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent transition"
                >
                  <option value="">Select your native language</option>
                  {COMMON_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-[#0f172a]">
                      {lang.emoji} {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-gradient-to-r from-[#7c3aed] to-[#14b8a6] text-white font-medium rounded-lg hover:shadow-lg hover:shadow-[#7c3aed]/50 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] transition-all flex items-center justify-center gap-2"
              >
                Continue
                <ChevronRight className="w-5 h-5" />
              </button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  Select languages to learn (up to 5)
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  {selectedLanguages.length} of 5 selected
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {languages.map((lang) => {
                    const selected = selectedLanguages.find((sl) => sl.languageId === lang.id);
                    return (
                      <button
                        key={lang.id}
                        onClick={() => toggleLanguage(lang.id)}
                        disabled={!selected && selectedLanguages.length >= 5}
                        className={`p-4 rounded-lg border transition-all text-left ${
                          selected
                            ? 'bg-[#7c3aed]/20 border-[#7c3aed]'
                            : 'bg-white/5 border-white/10 hover:border-[#14b8a6]'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{lang.flag_emoji}</span>
                          <span className="text-white font-medium">{lang.name}</span>
                          {selected && <Check className="w-5 h-5 text-[#14b8a6] ml-auto" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedLanguages.length > 0 && (
                <div>
                  <h4 className="text-white font-medium mb-3">Set proficiency levels</h4>
                  <div className="space-y-3">
                    {selectedLanguages.map((sl) => {
                      const lang = languages.find((l) => l.id === sl.languageId);
                      return (
                        <div
                          key={sl.languageId}
                          className="bg-white/5 border border-white/10 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">{lang?.flag_emoji}</span>
                              <span className="text-white font-medium">{lang?.name}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {(['beginner', 'intermediate', 'advanced'] as const).map((level) => (
                              <button
                                key={level}
                                onClick={() => updateLevel(sl.languageId, level)}
                                className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                  sl.level === level
                                    ? level === 'beginner'
                                      ? 'bg-green-500 text-white'
                                      : level === 'intermediate'
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-purple-500 text-white'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                              >
                                {level.charAt(0).toUpperCase() + level.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 bg-white/5 border border-white/10 text-white font-medium rounded-lg hover:bg-white/10 transition-all"
                >
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading || selectedLanguages.length === 0}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-[#7c3aed] to-[#14b8a6] text-white font-medium rounded-lg hover:shadow-lg hover:shadow-[#7c3aed]/50 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Setting up your account...' : 'Start Learning'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
