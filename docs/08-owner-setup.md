# Création du compte propriétaire — JACOB DE JESUS

## Procédure en 5 étapes

### Étape 1 — Inscription

Aller sur `/inscription` et créer un compte avec l'adresse e-mail
destinée au propriétaire (ex. `owner@jacob-de-jesus.com`). La
confirmation d'e-mail est désactivée : le compte est immédiatement actif.

### Étape 2 — Attribuer le rôle owner

Ouvrir le SQL Editor de Supabase et exécuter le script
`supabase/seed/create_owner.sql` après avoir remplacé
`owner@example.com` par l'adresse e-mail utilisée à l'étape 1.

Le script :
- vérifie qu'aucun autre owner n'existe déjà (garde anti-double) ;
- attribue le rôle `owner` dans `user_roles` ;
- journalise l'action dans `admin_audit_log`.

### Étape 3 — Connexion admin

Aller sur `/admin/connexion` et se connecter avec l'e-mail et le mot de
passe de l'étape 1.

### Étape 4 — Activer la MFA

Après la connexion, la page `/admin/mfa-setup` s'affiche automatiquement.
Scanner le QR code avec une application d'authentification (Google
Authenticator, Authy, etc.), puis saisir le code à 6 chiffres généré.

Conserver la clé manuelle TOTP affichée sur la page dans un gestionnaire
de mots de passe (1Password, Bitwarden, etc.). Elle permet de récupérer
l'accès si vous perdez votre téléphone.

### Étape 5 — Vérification

Accéder à `/admin`. Le tableau de bord s'affiche. L'utilisateur est
maintenant en `aal2` et peut gérer le catalogue, les commandes, les
clients, etc.

## Récupération en cas de perte de téléphone

1. **Retirer le facteur MFA** : dans le tableau de bord Supabase, aller
   dans **Authentication → Users**, trouver l'utilisateur propriétaire,
   cliquer sur **MFA** et supprimer le facteur TOTP.
2. **Se reconnecter** sur `/admin/connexion` : la page `/admin/mfa-setup`
   s'affiche à nouveau pour configurer un nouveau facteur.
3. **Utiliser la clé manuelle** (si le téléphone est disponible mais
   l'application a été perdue) : saisir la clé TOTP conservée dans le
   gestionnaire de mots de passe dans l'application d'authentification
   pour régénérer les codes.

Note : la suppression du facteur MFA depuis le tableau de bord Supabase
requiert un accès au compte Supabase lui-même. Conservez vos identifiants
Supabase en lieu sûr.
