import { useState, useEffect } from 'react';
import { supabase, Message, Language, ChatRoom } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, TrendingUp } from 'lucide-react';

type ActivityMessage = Message & {
  profile?: {
    display_name: string;
    avatar_url: string | null;
  };
  room?: {
    language: Language;
    proficiency_level: string;
  };
};

export function Home() {
  const { user } = useAuth();
  const [recentActivity, setRecentActivity] = useState<ActivityMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecentActivity();
  }, [user]);

  const fetchRecentActivity = async () => {
    if (!user) return;

    const { data: userLanguages } = await supabase
      .from('user_languages')
      .select('language_id, proficiency_level')
      .eq('user_id', user.id);

    if (!userLanguages) return;

    const roomPromises = userLanguages.map(async (ul) => {
      const { data: room } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('language_id', ul.language_id)
        .eq('proficiency_level', ul.proficiency_level)
        .maybeSingle();

      return room;
    });

    const rooms = (await Promise.all(roomPromises)).filter(Boolean) as ChatRoom[];
    const roomIds = rooms.map((r) => r.id);

    if (roomIds.length === 0) {
      setLoading(false);
      return;
    }

    const { data: messages } = await supabase
      .from('messages')
      .select(`
        *,
        profile:profiles(display_name, avatar_url)
      `)
      .in('room_id', roomIds)
      .order('created_at', { ascending: false })
      .limit(20);

    if (messages) {
      const messagesWithRooms = await Promise.all(
        messages.map(async (msg) => {
          const { data: room } = await supabase
            .from('chat_rooms')
            .select('*, language:languages(*)')
            .eq('id', msg.room_id)
            .maybeSingle();

          return {
            ...msg,
            room: room
              ? {
                  language: room.language,
                  proficiency_level: room.proficiency_level,
                }
              : undefined,
          };
        })
      );

      setRecentActivity(messagesWithRooms as ActivityMessage[]);
    }

    setLoading(false);
  };

  const formatTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = now.getTime() - time.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white">Loading feed...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8">
      <div className="mb-6 md:mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">Home Feed</h1>
        <p className="text-gray-400">Recent activity from your language rooms</p>
      </div>

      <div className="grid gap-4 md:gap-6">
        <div className="bg-gradient-to-br from-blue-500/10 to-emerald-500/10 border border-blue-500/20 rounded-2xl p-5 md:p-7">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Your Progress</h2>
          </div>
          <div className="grid grid-cols-3 gap-3 md:gap-4">
            <div className="bg-white/[0.06] backdrop-blur-sm rounded-xl p-4 border border-white/[0.08]">
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">{recentActivity.length}</div>
              <div className="text-gray-400 text-xs">Messages</div>
            </div>
            <div className="bg-white/[0.06] backdrop-blur-sm rounded-xl p-4 border border-white/[0.08]">
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                {new Set(recentActivity.map((a) => a.room_id)).size}
              </div>
              <div className="text-gray-400 text-xs">Rooms</div>
            </div>
            <div className="bg-white/[0.06] backdrop-blur-sm rounded-xl p-4 border border-white/[0.08]">
              <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                {recentActivity.filter((a) => a.user_id === user?.id).length}
              </div>
              <div className="text-gray-400 text-xs">Sent</div>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 md:p-7">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Recent Activity</h2>
          </div>

          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
                  <MessageSquare className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-gray-400">No recent activity. Start chatting in your language rooms!</p>
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.06] hover:border-white/[0.1] transition-all"
                >
                  <div className="flex gap-3">
                    {activity.is_ai_tutor ? (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <img
                        src={activity.profile?.avatar_url || 'https://via.placeholder.com/44'}
                        alt={activity.profile?.display_name || 'User'}
                        className="w-11 h-11 rounded-full flex-shrink-0 object-cover ring-2 ring-white/10"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-white font-semibold">
                          {activity.is_ai_tutor
                            ? 'AI Tutor'
                            : activity.profile?.display_name || 'User'}
                        </span>
                        {activity.room && (
                          <span className="text-emerald-400 text-sm bg-emerald-500/10 px-2 py-0.5 rounded-md">
                            {activity.room.language.flag_emoji} {activity.room.language.name}
                          </span>
                        )}
                        <span className="text-gray-500 text-xs ml-auto">
                          {formatTime(activity.created_at)}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm line-clamp-2">{activity.content}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
