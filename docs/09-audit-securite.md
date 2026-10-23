# Audit de securite et de qualite : resultats et liste avant ouverture

## Ce qui a ete verifie (sur une base PostgreSQL locale imitant Supabase)
- Les 27 migrations s'appliquent sans erreur sur une base vierge, dans l'ordre.
- Tests de securite : `rls.sql` 12/12, `orders.sql` 10/10, `auth.sql` 23/23.
- Aucune politique n'accepte un proprietaire sans MFA (aal2 partout).
- Aucun secret dans le code, `.env` ignore par Git, plus de classes Tailwind inoperantes.
- `npm run build`, `npm run lint` et `npm test` (33 tests) passent.

## Corrige par la migration 20261022120000_securite_audit.sql
1. place_order lisait le poids du colis dans la requete du navigateur : un client pouvait
   choisir la tranche de livraison la moins chere. Le poids est maintenant ignore.
   Consequence : configurez des tarifs de livraison PAR ZONE (tranche 0, sans plafond).
   Les tarifs par poids ne seront utilisables qu'apres l'ajout d'un poids aux produits.
2. log_admin_action etait appelable par n'importe quel visiteur (faux journal d'audit possible).
3. Annuler une commande laissait son paiement "en attente", et on pouvait marquer "paye" une
   commande annulee. Un remboursement laissait le paiement "paye". Corrige.
4. Revoke explicite des fonctions d'administration pour les visiteurs non connectes.

## Corrige dans les fichiers de tests
- auth.sql ne pouvait pas s'executer (syntaxe invalide). Reecrit : un seul message de resultat.
- rls.sql testait l'administrateur sans MFA (obsolete). orders.sql ecrivait dans une table
  temporaire sans droit. vite.config.ts : les tests ne dependent plus du fichier .env.
- La migration categories_polo_et_nouvelles etait vide : elle contient maintenant le SQL.

## A faire AVANT d'ouvrir au public
- [ ] `npx supabase db push`, puis lancer auth.sql, rls.sql, orders.sql dans le SQL Editor.
- [ ] Compte proprietaire cree, MFA activee, un compte client refuse sur /admin.
- [ ] Anti-spam : place_order est ouvert aux visiteurs. Sans protection, quelqu'un peut passer
      de fausses commandes pour bloquer le stock. Ajouter Cloudflare Turnstile + Edge Function.
- [ ] Test de commandes simultanees sur le dernier article (deux navigateurs en meme temps).
- [ ] Tarifs de livraison reels saisis (zone, ville, prix). Sans tarif, aucune commande possible.
- [ ] E-mails de confirmation : service d'envoi dedie (la limite gratuite de Supabase est basse).
- [ ] Produits, photos et stocks reels ; supprimer les produits de demonstration.
- [ ] Textes legaux rediges et relus (CGV, confidentialite, retours, mentions).
- [ ] Projet Supabase de production separe, Site URL et Redirect URLs sur le vrai domaine.

## Points mineurs a surveiller
- Un code promo annule n'est pas re-credite (used_count).
- Le tableau de bord appelle "nouveaux clients" les clients ayant commande sur la periode.
- Le test des commandes simultanees de orders.sql est sequentiel (le verrouillage est correct
  dans le code, mais un vrai test a deux sessions reste recommande).
