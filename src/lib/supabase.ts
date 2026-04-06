import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  display_name: string;
  native_language: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Language = {
  id: string;
  name: string;
  code: string;
  flag_emoji: string;
  created_at: string;
};

export type UserLanguage = {
  id: string;
  user_id: string;
  language_id: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced';
  created_at: string;
};

export type ChatRoom = {
  id: string;
  language_id: string;
  proficiency_level: 'beginner' | 'intermediate' | 'advanced';
  created_at: string;
};

export type Message = {
  id: string;
  room_id: string;
  user_id: string | null;
  content: string;
  is_ai_tutor: boolean;
  created_at: string;
};

export type DirectMessage = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

export type PracticeRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at: string;
};

export type DailyPrompt = {
  id: string;
  room_id: string;
  prompt_text: string;
  date: string;
  created_at: string;
};
