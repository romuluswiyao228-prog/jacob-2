/*
# Migration contact_messages_length_check

Contraintes CHECK de longueur sur la table contact_messages :
- nom : max 100 caractères
- sujet : max 150 caractères
- message : max 2000 caractères
- colonnes facultatives phone et order_number
*/

-- 1. Colonnes facultatives pour téléphone et numéro de commande
ALTER TABLE public.contact_messages
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS order_number text;

-- 2. Contraintes de longueur maximale
ALTER TABLE public.contact_messages
  DROP CONSTRAINT IF EXISTS chk_contact_messages_name_len,
  ADD CONSTRAINT chk_contact_messages_name_len CHECK (char_length(name) <= 100);

ALTER TABLE public.contact_messages
  DROP CONSTRAINT IF EXISTS chk_contact_messages_subject_len,
  ADD CONSTRAINT chk_contact_messages_subject_len CHECK (char_length(subject) <= 150);

ALTER TABLE public.contact_messages
  DROP CONSTRAINT IF EXISTS chk_contact_messages_message_len,
  ADD CONSTRAINT chk_contact_messages_message_len CHECK (char_length(message) <= 2000);
