/*
# Correction finale : is_admin() exécutable par authenticated

## Problème
Le linter signale que `is_admin()` peut être appelée via l'API REST par
les utilisateurs authentifiés. Bien que cette fonction ne fasse que lire
user_roles et retourne un booléen, un appel RPC direct n'est pas nécessaire
car elle est uniquement utilisée dans les politiques RLS (qui n'ont pas
besoin du grant EXECUTE).

## Correction
REVOKE EXECUTE FROM authenticated sur is_admin().
Les politiques RLS continuent à appeler is_admin() car elles s'exécutent
avec les privilèges du propriétaire de la table, pas via l'API REST.
*/

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM authenticated;
