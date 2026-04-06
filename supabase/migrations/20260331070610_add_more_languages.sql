/*
  # Add More Languages to Lingora

  This migration adds English and additional languages to the languages table
  and creates chat rooms for all new language + level combinations.

  ## New Languages Added
  - English (en) - 🇬🇧
  - Urdu (ur) - 🇵🇰
  - Bengali (bn) - 🇧🇩
  - Indonesian (id) - 🇮🇩
  - Dutch (nl) - 🇳🇱
  - Polish (pl) - 🇵🇱
  - Swedish (sv) - 🇸🇪
  - Greek (el) - 🇬🇷
  - Hebrew (he) - 🇮🇱
*/

INSERT INTO languages (name, code, flag_emoji) VALUES
  ('English', 'en', '🇬🇧'),
  ('Urdu', 'ur', '🇵🇰'),
  ('Bengali', 'bn', '🇧🇩'),
  ('Indonesian', 'id', '🇮🇩'),
  ('Dutch', 'nl', '🇳🇱'),
  ('Polish', 'pl', '🇵🇱'),
  ('Swedish', 'sv', '🇸🇪'),
  ('Greek', 'el', '🇬🇷'),
  ('Hebrew', 'he', '🇮🇱')
ON CONFLICT (code) DO NOTHING;

INSERT INTO chat_rooms (language_id, proficiency_level)
SELECT l.id, level
FROM languages l
CROSS JOIN (VALUES ('beginner'), ('intermediate'), ('advanced')) AS levels(level)
WHERE l.code IN ('en', 'ur', 'bn', 'id', 'nl', 'pl', 'sv', 'el', 'he')
ON CONFLICT (language_id, proficiency_level) DO NOTHING;

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
INNER JOIN languages l ON cr.language_id = l.id
WHERE l.code IN ('en', 'ur', 'bn', 'id', 'nl', 'pl', 'sv', 'el', 'he')
ON CONFLICT (room_id, date) DO NOTHING;
