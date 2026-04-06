import { useState, useEffect, useRef } from 'react';
import { supabase, DirectMessage, Profile, PracticeRequest } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Send, UserPlus, Check, X } from 'lucide-react';
import { RealtimeChannel } from '@supabase/supabase-js';

type Conversation = {
  profile: Profile;
  lastMessage?: DirectMessage;
  unreadCount: number;
};

type DirectMessageWithProfile = DirectMessage & {
  sender?: Profile;
  receiver?: Profile;
};

type PracticeRequestWithSender = PracticeRequest & {
  sender: Profile;
};

export function Messages() {
  const { user, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<DirectMessageWithProfile[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PracticeRequestWithSender[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    fetchConversations();
    fetchPendingRequests();
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages();
      subscribeToMessages();
      markAsRead();
    }

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    if (!user) return;

    const { data: sentMessages } = await supabase
      .from('direct_messages')
      .select('*, receiver:profiles!direct_messages_receiver_id_fkey(*)')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false });

    const { data: receivedMessages } = await supabase
      .from('direct_messages')
      .select('*, sender:profiles!direct_messages_sender_id_fkey(*)')
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false });

    const allMessages = [...(sentMessages || []), ...(receivedMessages || [])];

    const conversationMap = new Map<string, Conversation>();

    allMessages.forEach((msg) => {
      const otherProfile =
        msg.sender_id === user.id ? msg.receiver : msg.sender;

      if (!otherProfile || !otherProfile.id) return;

      const existing = conversationMap.get(otherProfile.id);

      if (
        !existing ||
        new Date(msg.created_at) > new Date(existing.lastMessage?.created_at || 0)
      ) {
        const unreadCount =
          msg.receiver_id === user.id && !msg.read_at
            ? (existing?.unreadCount || 0) + 1
            : existing?.unreadCount || 0;

        conversationMap.set(otherProfile.id, {
          profile: otherProfile,
          lastMessage: msg,
          unreadCount,
        });
      }
    });

    setConversations(Array.from(conversationMap.values()));
  };

  const fetchPendingRequests = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('practice_requests')
      .select('*, sender:profiles!practice_requests_sender_id_fkey(*)')
      .eq('receiver_id', user.id)
      .eq('status', 'pending');

    if (data) setPendingRequests(data);
  };

  const fetchMessages = async () => {
    if (!selectedConversation || !user) return;

    const { data } = await supabase
      .from('direct_messages')
      .select('*, sender:profiles!direct_messages_sender_id_fkey(*), receiver:profiles!direct_messages_receiver_id_fkey(*)')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${selectedConversation.id}),and(sender_id.eq.${selectedConversation.id},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    if (data) setMessages(data as DirectMessageWithProfile[]);
  };

  const subscribeToMessages = () => {
    if (!selectedConversation || !user) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`dm:${user.id}:${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_messages',
          filter: `sender_id=eq.${selectedConversation.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as DirectMessage;

          if (newMsg.receiver_id === user.id || newMsg.sender_id === user.id) {
            const { data: sender } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newMsg.sender_id)
              .maybeSingle();

            const { data: receiver } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', newMsg.receiver_id)
              .maybeSingle();

            setMessages((prev) => [
              ...prev,
              { ...newMsg, sender: sender || undefined, receiver: receiver || undefined },
            ]);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
  };

  const markAsRead = async () => {
    if (!selectedConversation || !user) return;

    await supabase
      .from('direct_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('sender_id', selectedConversation.id)
      .eq('receiver_id', user.id)
      .is('read_at', null);

    fetchConversations();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || !user) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase.from('direct_messages').insert({
      sender_id: user.id,
      receiver_id: selectedConversation.id,
      content: messageContent,
    });

    if (!error) {
      fetchConversations();
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim() || !user) return;

    setLoading(true);

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', user.id)
      .ilike('display_name', `%${searchQuery}%`)
      .limit(10);

    if (data) setSearchResults(data);

    setLoading(false);
  };

  const sendPracticeRequest = async (receiverId: string) => {
    if (!user) return;

    setLoading(true);

    const { error } = await supabase.from('practice_requests').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      status: 'pending',
    });

    if (!error) {
      alert('Practice request sent!');
      setShowSearch(false);
      setSearchQuery('');
      setSearchResults([]);
    }

    setLoading(false);
  };

  const handlePracticeRequest = async (requestId: string, status: 'accepted' | 'rejected') => {
    const { error } = await supabase
      .from('practice_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (!error) {
      fetchPendingRequests();
      if (status === 'accepted') {
        fetchConversations();
      }
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex h-screen w-full">
      <div className="hidden md:flex md:w-80 bg-white/[0.04] backdrop-blur-xl border-r border-white/[0.08] flex-col">
        <div className="p-4 border-b border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Messages</h2>
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="p-2 bg-gradient-to-r from-blue-500 to-emerald-500 text-white rounded-lg hover:shadow-lg transition-all"
            >
              <UserPlus className="w-5 h-5" />
            </button>
          </div>

          {showSearch && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchUsers()}
                  placeholder="Search users..."
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7c3aed]"
                />
                <button
                  onClick={searchUsers}
                  disabled={loading}
                  className="px-4 py-2 bg-[#7c3aed] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Search
                </button>
              </div>

              {searchResults.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-2 max-h-60 overflow-y-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="flex items-center justify-between p-2 hover:bg-white/5 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <img
                          src={result.avatar_url || 'https://via.placeholder.com/32'}
                          alt={result.display_name}
                          className="w-8 h-8 rounded-full"
                        />
                        <span className="text-white text-sm">{result.display_name}</span>
                      </div>
                      <button
                        onClick={() => sendPracticeRequest(result.id)}
                        disabled={loading}
                        className="text-[#14b8a6] hover:text-[#7c3aed] text-xs font-medium disabled:opacity-50"
                      >
                        Request
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {pendingRequests.length > 0 && (
          <div className="p-4 bg-[#7c3aed]/10 border-b border-[#7c3aed]/30">
            <h3 className="text-white text-sm font-medium mb-3">Practice Requests</h3>
            <div className="space-y-2">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white/5 rounded-lg p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src={request.sender.avatar_url || 'https://via.placeholder.com/32'}
                      alt={request.sender.display_name}
                      className="w-8 h-8 rounded-full"
                    />
                    <span className="text-white text-sm">{request.sender.display_name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePracticeRequest(request.id, 'accepted')}
                      className="p-1 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePracticeRequest(request.id, 'rejected')}
                      className="p-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {conversations.length === 0 ? (
            <p className="text-gray-400 text-center text-sm py-8">
              No conversations yet. Search for users to start chatting!
            </p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.profile.id}
                onClick={() => setSelectedConversation(conv.profile)}
                className={`w-full text-left p-3 rounded-lg transition-all ${
                  selectedConversation?.id === conv.profile.id
                    ? 'bg-[#7c3aed]/20 border border-[#7c3aed]'
                    : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={conv.profile.avatar_url || 'https://via.placeholder.com/40'}
                    alt={conv.profile.display_name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white font-medium">{conv.profile.display_name}</span>
                      {conv.unreadCount > 0 && (
                        <span className="bg-[#14b8a6] text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                          {conv.unreadCount}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-gray-400 text-sm truncate">{conv.lastMessage.content}</p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedConversation ? (
          <>
            <div className="bg-white/5 backdrop-blur-lg border-b border-white/10 p-4 hidden md:block">
              <div className="flex items-center gap-3">
                <img
                  src={selectedConversation.avatar_url || 'https://via.placeholder.com/40'}
                  alt={selectedConversation.display_name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {selectedConversation.display_name}
                  </h2>
                  <p className="text-gray-400 text-sm">Language Partner</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <img
                      src={
                        isMe
                          ? profile?.avatar_url || 'https://via.placeholder.com/40'
                          : selectedConversation.avatar_url || 'https://via.placeholder.com/40'
                      }
                      alt="Avatar"
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                    <div className={`flex-1 ${isMe ? 'text-right' : ''}`}>
                      <div
                        className={`inline-block px-4 py-2 rounded-lg ${
                          isMe
                            ? 'bg-gradient-to-r from-[#7c3aed] to-[#14b8a6] text-white'
                            : 'bg-white/5 text-gray-300'
                        }`}
                      >
                        <p>{msg.content}</p>
                      </div>
                      <p className="text-gray-500 text-xs mt-1">{formatTime(msg.created_at)}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white/5 backdrop-blur-lg border-t border-white/10 p-4">
              <form onSubmit={sendMessage} className="flex gap-2 md:gap-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 px-3 md:px-4 py-2 md:py-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm md:text-base placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent transition"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-3 md:px-6 py-2 md:py-3 bg-gradient-to-r from-[#7c3aed] to-[#14b8a6] text-white font-medium rounded-lg text-sm md:text-base hover:shadow-lg hover:shadow-[#7c3aed]/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 whitespace-nowrap"
                >
                  <Send className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden md:inline">Send</span>
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-400">Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
