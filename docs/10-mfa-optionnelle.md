# Double authentification (MFA) : interrupteur

## Etat actuel
La MFA de l'administration est DESACTIVEE : le proprietaire se connecte avec son
e-mail et son mot de passe. Le role "owner" reste obligatoire : un client ou un
visiteur n'a toujours aucun acces a l'administration.

## Se connecter
1. /admin/connexion
2. E-mail et mot de passe, puis "Continuer" : le site ouvre directement /admin.

## Remettre la MFA obligatoire (plus tard)
Dans le SQL Editor de Supabase :

    CREATE OR REPLACE FUNCTION public.admin_requires_mfa()
    RETURNS boolean LANGUAGE sql STABLE
    SET search_path TO 'public', 'pg_temp'
    AS $$ SELECT true; $$;

Au prochain acces, le site demande d'activer la MFA (QR code), puis le code a 6 chiffres
a chaque connexion. Pour l'eteindre de nouveau : meme requete avec `SELECT false;`.
Gardez aussi ce changement dans un fichier de migration (supabase migration new).

## Sans MFA, protegez votre mot de passe
- Phrase de passe longue (4 ou 5 mots, 20 caracteres ou plus), jamais utilisee ailleurs.
- Gestionnaire de mots de passe ; ne le partagez jamais ni par message ni par e-mail.
- Connectez-vous a l'administration seulement depuis vos appareils.
- Ne cliquez jamais sur un lien de connexion recu par message ou par e-mail.

## Confirmer l'e-mail du proprietaire sans attendre l'e-mail de Supabase
La limite d'envoi gratuite de Supabase est basse. Dans le SQL Editor, avec VOTRE adresse :

    UPDATE auth.users SET email_confirmed_at = now()
    WHERE email = 'votre@adresse.com' AND email_confirmed_at IS NULL;

## Correction incluse
Le niveau de MFA (aal1 / aal2) etait cherche dans des champs qui n'existent pas dans une
session Supabase : il valait toujours "inconnu", donc meme avec le bon code a 6 chiffres le
site renvoyait vers l'activation de la MFA. Il est maintenant lu dans le jeton de connexion.
