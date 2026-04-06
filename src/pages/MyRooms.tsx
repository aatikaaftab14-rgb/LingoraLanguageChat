import { useState, useEffect, useRef } from 'react';
import { supabase, Language, ChatRoom, Message, DailyPrompt } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, Users, Pin, Smile } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';

type RoomWithDetails = ChatRoom & {
  language: Language;
  daily_prompt?: DailyPrompt;
  member_count?: number;
};

type MessageWithProfile = Message & {
  profile?: {
    display_name: string;
    avatar_url: string | null;
    native_language: string;
  };
};

const LEVEL_COLORS = {
  beginner: 'bg-emerald-500',
  intermediate: 'bg-blue-500',
  advanced: 'bg-orange-500',
};

const NATIVE_LANGUAGE_FLAGS: Record<string, string> = {
  en: '🇬🇧',
  es: '🇪🇸',
  fr: '🇫🇷',
  de: '🇩🇪',
  it: '🇮🇹',
  pt: '🇵🇹',
  ja: '🇯🇵',
  zh: '🇨🇳',
  ko: '🇰🇷',
  ru: '🇷🇺',
  ar: '🇸🇦',
  hi: '🇮🇳',
};

export function MyRooms() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomWithDetails[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<RoomWithDetails | null>(null);
  const [messages, setMessages] = useState<MessageWithProfile[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    fetchUserRooms();
  }, [user]);

  useEffect(() => {
    if (selectedRoom) {
      fetchMessages();
      subscribeToMessages();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [selectedRoom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchUserRooms = async () => {
    if (!user) return;

    const { data: userLanguages } = await supabase
      .from('user_languages')
      .select('*')
      .eq('user_id', user.id);

    if (!userLanguages) return;

    const roomPromises = userLanguages.map(async (ul) => {
      const { data: room } = await supabase
        .from('chat_rooms')
        .select('*')
        .eq('language_id', ul.language_id)
        .eq('proficiency_level', ul.proficiency_level)
        .maybeSingle();

      if (!room) return null;

      const { data: language } = await supabase
        .from('languages')
        .select('*')
        .eq('id', ul.language_id)
        .maybeSingle();

      const { data: prompt } = await supabase
        .from('daily_prompts')
        .select('*')
        .eq('room_id', room.id)
        .eq('date', new Date().toISOString().split('T')[0])
        .maybeSingle();

      return {
        ...room,
        language: language!,
        daily_prompt: prompt || undefined,
      };
    });

    const roomsData = (await Promise.all(roomPromises)).filter(Boolean) as RoomWithDetails[];
    setRooms(roomsData);

    if (roomsData.length > 0 && !selectedRoom) {
      setSelectedRoom(roomsData[0]);
    }

    setLoading(false);
  };

  const fetchMessages = async () => {
    if (!selectedRoom) return;

    const { data } = await supabase
      .from('messages')
      .select(`
        *,
        profile:profiles(display_name, avatar_url, native_language)
      `)
      .eq('room_id', selectedRoom.id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (data) {
      setMessages(data as MessageWithProfile[]);
    }
  };

  const subscribeToMessages = () => {
    if (!selectedRoom) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`room:${selectedRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.${selectedRoom.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message;

          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, native_language')
            .eq('id', newMsg.user_id)
            .maybeSingle();

          setMessages((prev) => [...prev, { ...newMsg, profile: profile || undefined }]);
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedRoom || !user || sending) return;

    setSending(true);

    const messageContent = newMessage.trim();
    setNewMessage('');

    await supabase.from('messages').insert({
      room_id: selectedRoom.id,
      user_id: user.id,
      content: messageContent,
      is_ai_tutor: false,
    });

    if (messageContent.includes('@tutor')) {
      setTimeout(async () => {
        const tutorResponse = await callAITutor(messageContent, selectedRoom.language.name);
        await supabase.from('messages').insert({
          room_id: selectedRoom.id,
          user_id: null,
          content: tutorResponse,
          is_ai_tutor: true,
        });
      }, 1000);
    }

    setSending(false);
  };

  const callAITutor = async (message: string, language: string): Promise<string> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, language }),
      });

      const data = await response.json();
      return data.response || 'I apologize, but I am having trouble responding right now.';
    } catch (error) {
      return 'I apologize, but I am having trouble responding right now.';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-white">Loading your rooms...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden w-full">
      <div className="hidden md:flex md:w-80 bg-white/[0.04] backdrop-blur-xl border-r border-white/[0.08] flex-col">
        <div className="p-6 border-b border-white/[0.08]">
          <h2 className="text-xl font-bold text-white">My Language Rooms</h2>
          <p className="text-gray-400 text-sm mt-1">{rooms.length} active rooms</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => setSelectedRoom(room)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                selectedRoom?.id === room.id
                  ? 'bg-blue-500/10 border-blue-500/30'
                  : 'bg-white/[0.04] border-white/[0.08] hover:border-emerald-500/30 hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{room.language.flag_emoji}</span>
                <div className="flex-1">
                  <h3 className="text-white font-medium">{room.language.name}</h3>
                  <span
                    className={`inline-block px-2 py-1 rounded-md text-xs font-medium text-white ${
                      LEVEL_COLORS[room.proficiency_level]
                    }`}
                  >
                    {room.proficiency_level}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Users className="w-4 h-4" />
                <span>Active now</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
        {selectedRoom ? (
          <>
            <div className="bg-white/[0.04] backdrop-blur-xl border-b border-white/[0.08] p-4">
              <div className="md:hidden mb-3">
                <select
                  value={selectedRoom.id}
                  onChange={(e) => {
                    const room = rooms.find((r) => r.id === e.target.value);
                    if (room) setSelectedRoom(room);
                  }}
                  className="w-full px-3 py-2 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id} className="bg-[#0f172a]">
                      {room.language.flag_emoji} {room.language.name} - {room.proficiency_level}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{selectedRoom.language.flag_emoji}</span>
                <div>
                  <h2 className="text-xl font-bold text-white hidden md:block">
                    {selectedRoom.language.name} - {selectedRoom.proficiency_level}
                  </h2>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span>Chat room</span>
                  </div>
                </div>
              </div>

              {selectedRoom.daily_prompt && (
                <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                  <div className="flex items-start gap-2">
                    <Pin className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-emerald-400 text-xs font-medium mb-1">Daily Prompt</p>
                      <p className="text-white text-sm">{selectedRoom.daily_prompt.prompt_text}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.is_ai_tutor ? 'bg-blue-500/5 -mx-4 px-4 py-3 border-l-2 border-blue-500/30' : ''}`}
                >
                  {msg.is_ai_tutor ? (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                      <Smile className="w-5 h-5 text-white" />
                    </div>
                  ) : (
                    <img
                      src={msg.profile?.avatar_url || 'https://via.placeholder.com/40'}
                      alt={msg.profile?.display_name || 'User'}
                      className="w-10 h-10 rounded-full flex-shrink-0 object-cover ring-2 ring-white/10"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-white font-semibold text-sm">
                        {msg.is_ai_tutor ? 'AI Tutor' : msg.profile?.display_name || 'User'}
                      </span>
                      {!msg.is_ai_tutor && msg.profile?.native_language && (
                        <span className="text-base">
                          {NATIVE_LANGUAGE_FLAGS[msg.profile.native_language] || '🌐'}
                        </span>
                      )}
                      <span className="text-gray-500 text-xs ml-auto">{formatTime(msg.created_at)}</span>
                    </div>
                    <p className="text-gray-300 text-sm break-words">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white/[0.04] backdrop-blur-xl border-t border-white/[0.08] p-3">
              <form onSubmit={sendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message in ${selectedRoom.language.name}...`}
                  className="flex-1 px-4 py-3 bg-white/[0.06] border border-white/[0.1] rounded-xl text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  disabled={sending}
                />
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className="px-4 py-3 bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                  <span className="hidden sm:inline">Send</span>
                </button>
              </form>
              <p className="text-gray-500 text-xs mt-2 hidden md:block">
                Tip: Mention @tutor for grammar help or vocabulary assistance
              </p>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.06] flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-400">Select a room to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
