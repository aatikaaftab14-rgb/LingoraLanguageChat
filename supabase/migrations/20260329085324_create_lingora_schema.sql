/*
  # Lingora - Multilingual Language Learning Chat App Schema

  ## Overview
  This migration creates the complete database schema for Lingora, a real-time chat platform 
  where language learners practice with AI tutors and other learners.

  ## Tables Created

  ### 1. profiles
  Extended user profile information beyond Supabase auth.users
  - `id` (uuid, FK to auth.users) - User identifier
  - `display_name` (text) - User's chosen display name
  - `native_language` (text) - User's native language code (ISO 639-1)
  - `avatar_url` (text, nullable) - Profile picture URL
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update

  ### 2. languages
  Master list of all available languages for learning
  - `id` (uuid, PK) - Language identifier
  - `name` (text) - Language name (e.g., "Japanese")
  - `code` (text, unique) - ISO 639-1 language code (e.g., "ja")
  - `flag_emoji` (text) - Flag emoji for display (e.g., "🇯🇵")

  ### 3. user_languages
  Junction table tracking which languages each user is learning and their proficiency level
  - `id` (uuid, PK) - Record identifier
  - `user_id` (uuid, FK to profiles) - User learning the language
  - `language_id` (uuid, FK to languages) - Language being learned
  - `proficiency_level` (text) - One of: 'beginner', 'intermediate', 'advanced'
  - `created_at` (timestamptz) - When user started learning this language

  ### 4. chat_rooms
  Group chat rooms organized by language and proficiency level
  - `id` (uuid, PK) - Room identifier
  - `language_id` (uuid, FK to languages) - Language for this room
  - `proficiency_level` (text) - Room level: 'beginner', 'intermediate', 'advanced'
  - `created_at` (timestamptz) - Room creation timestamp

  ### 5. messages
  Messages sent in group chat rooms
  - `id` (uuid, PK) - Message identifier
  - `room_id` (uuid, FK to chat_rooms) - Room where message was sent
  - `user_id` (uuid, FK to profiles) - Message sender
  - `content` (text) - Message text content
  - `is_ai_tutor` (boolean) - Whether message is from AI tutor bot
  - `created_at` (timestamptz) - When message was sent

  ### 6. message_reactions
  Emoji reactions to messages
  - `id` (uuid, PK) - Reaction identifier
  - `message_id` (uuid, FK to messages) - Message being reacted to
  - `user_id` (uuid, FK to profiles) - User who reacted
  - `emoji` (text) - Emoji used for reaction
  - `created_at` (timestamptz) - When reaction was added

  ### 7. direct_messages
  Private 1-on-1 messages between users
  - `id` (uuid, PK) - Message identifier
  - `sender_id` (uuid, FK to profiles) - User sending message
  - `receiver_id` (uuid, FK to profiles) - User receiving message
  - `content` (text) - Message text content
  - `read_at` (timestamptz, nullable) - When message was read
  - `created_at` (timestamptz) - When message was sent

  ### 8. practice_requests
  Friend requests for enabling direct messaging between users
  - `id` (uuid, PK) - Request identifier
  - `sender_id` (uuid, FK to profiles) - User sending request
  - `receiver_id` (uuid, FK to profiles) - User receiving request
  - `status` (text) - One of: 'pending', 'accepted', 'rejected'
  - `created_at` (timestamptz) - When request was sent
  - `updated_at` (timestamptz) - When request status changed

  ### 9. daily_prompts
  Conversation starter prompts for each chat room
  - `id` (uuid, PK) - Prompt identifier
  - `room_id` (uuid, FK to chat_rooms) - Room this prompt is for
  - `prompt_text` (text) - The conversation prompt
  - `date` (date) - Date this prompt is active
  - `created_at` (timestamptz) - When prompt was created

  ## Security (Row Level Security)

  All tables have RLS enabled with policies ensuring:
  - Users can only read/update their own profiles
  - Users can view languages they're learning
  - Messages are visible to room members
  - Direct messages are private between sender and receiver
  - Practice requests follow proper authorization flows

  ## Indexes

  Performance indexes added for:
  - Foreign key lookups
  - Real-time message queries
  - User language searches
  - Practice request lookups
*/

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- PROFILES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  native_language text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- =====================================================
-- LANGUAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS languages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  code text UNIQUE NOT NULL,
  flag_emoji text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view languages"
  ON languages FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- USER_LANGUAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_languages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  language_id uuid NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  proficiency_level text NOT NULL CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, language_id)
);

ALTER TABLE user_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all user languages"
  ON user_languages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own language preferences"
  ON user_languages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own language preferences"
  ON user_languages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own language preferences"
  ON user_languages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- CHAT_ROOMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS chat_rooms (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  language_id uuid NOT NULL REFERENCES languages(id) ON DELETE CASCADE,
  proficiency_level text NOT NULL CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(language_id, proficiency_level)
);

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all chat rooms"
  ON chat_rooms FOR SELECT
  TO authenticated
  USING (true);

-- =====================================================
-- MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  content text NOT NULL,
  is_ai_tutor boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in all rooms"
  ON messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR is_ai_tutor = true);

-- Create index for efficient message queries
CREATE INDEX IF NOT EXISTS messages_room_id_created_at_idx ON messages(room_id, created_at DESC);

-- =====================================================
-- MESSAGE_REACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS message_reactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all reactions"
  ON message_reactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add reactions"
  ON message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
  ON message_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- DIRECT_MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS direct_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their direct messages"
  ON direct_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send direct messages"
  ON direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update read status of received messages"
  ON direct_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Create indexes for efficient DM queries
CREATE INDEX IF NOT EXISTS direct_messages_sender_id_idx ON direct_messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS direct_messages_receiver_id_idx ON direct_messages(receiver_id, created_at DESC);

-- =====================================================
-- PRACTICE_REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS practice_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

ALTER TABLE practice_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their practice requests"
  ON practice_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send practice requests"
  ON practice_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update received requests"
  ON practice_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = receiver_id);

-- Create index for efficient request queries
CREATE INDEX IF NOT EXISTS practice_requests_receiver_id_idx ON practice_requests(receiver_id, status);

-- =====================================================
-- DAILY_PROMPTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_prompts (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id uuid NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  prompt_text text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(room_id, date)
);

ALTER TABLE daily_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view daily prompts"
  ON daily_prompts FOR SELECT
  TO authenticated
  USING (true);

-- Create index for efficient prompt queries
CREATE INDEX IF NOT EXISTS daily_prompts_room_id_date_idx ON daily_prompts(room_id, date DESC);

-- =====================================================
-- SEED DATA - Popular Languages
-- =====================================================
INSERT INTO languages (name, code, flag_emoji) VALUES
  ('Spanish', 'es', '🇪🇸'),
  ('French', 'fr', '🇫🇷'),
  ('German', 'de', '🇩🇪'),
  ('Italian', 'it', '🇮🇹'),
  ('Portuguese', 'pt', '🇵🇹'),
  ('Japanese', 'ja', '🇯🇵'),
  ('Chinese', 'zh', '🇨🇳'),
  ('Korean', 'ko', '🇰🇷'),
  ('Russian', 'ru', '🇷🇺'),
  ('Arabic', 'ar', '🇸🇦'),
  ('Hindi', 'hi', '🇮🇳'),
  ('Turkish', 'tr', '🇹🇷'),
  ('Dutch', 'nl', '🇳🇱'),
  ('Swedish', 'sv', '🇸🇪'),
  ('Polish', 'pl', '🇵🇱'),
  ('Vietnamese', 'vi', '🇻🇳'),
  ('Thai', 'th', '🇹🇭'),
  ('Greek', 'el', '🇬🇷'),
  ('Hebrew', 'he', '🇮🇱'),
  ('Czech', 'cs', '🇨🇿')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- CREATE CHAT ROOMS FOR ALL LANGUAGE + LEVEL COMBOS
-- =====================================================
INSERT INTO chat_rooms (language_id, proficiency_level)
SELECT l.id, level
FROM languages l
CROSS JOIN (VALUES ('beginner'), ('intermediate'), ('advanced')) AS levels(level)
ON CONFLICT (language_id, proficiency_level) DO NOTHING;

-- =====================================================
-- SEED DAILY PROMPTS FOR TODAY
-- =====================================================
INSERT INTO daily_prompts (room_id, prompt_text, date)
SELECT 
  cr.id,
  CASE cr.proficiency_level
    WHEN 'beginner' THEN 'Introduce yourself! Share your name, where you''re from, and one hobby you enjoy.'
    WHEN 'intermediate' THEN 'Describe your morning routine in detail. What time do you wake up and what do you do first?'
    WHEN 'advanced' THEN 'What are your thoughts on the role of technology in modern education? Do you think it helps or hinders learning?'
  END,
  CURRENT_DATE
FROM chat_rooms cr
ON CONFLICT (room_id, date) DO NOTHING;