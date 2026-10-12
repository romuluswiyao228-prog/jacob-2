/*
# Correction : is_admin() doit rester exécutable par authenticated

## Problème
La migration 012 a révoqué EXECUTE sur is_admin() de authenticated.
Cela casse les politiques RLS qui appellent is_admin() : les requêtes
authentifiées obtiennent "permission denied for function is_admin".

## Correction
Restaurer GRANT EXECUTE sur is_admin() pour authenticated.
Les politiques RLS appellent is_admin() dans le contexte de la requête
authentifiée — la fonction doit donc être exécutable par authenticated.
is_admin() ne fait que lire user_roles et retourne un booléen, sans
effet de bord : un appel RPC direct n'est pas dangereux.

## Note
Le linter signale ceci comme un WARNING, mais c'est un faux positif
dans notre cas : is_admin() est intentionnellement publique pour
lecture car elle est utilisée dans les politiques RLS.
*/

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
