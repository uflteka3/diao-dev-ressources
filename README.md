# DIAO DEV RESSOURCES

Plateforme de ressources numériques gratuite pour la marque DIAO DEV.

## Fonctionnalités incluses dans cette première version

- Interface responsive en français (mobile-first).
- Accueil et catalogue de ressources.
- Recherche plein texte côté client sur titre, descriptions, catégories et tags.
- Filtres par catégories.
- Fiches individuelles de ressources.
- Liens externes et téléchargements.
- Formulaire d'inscription facultatif à la newsletter.
- Espace de connexion administrateur Supabase.
- Création, modification, publication et suppression de ressources.
- Compteurs de consultations, clics et téléchargements via fonction SQL.
- Mode aperçu local avec ressources de démonstration.

## Démarrage local

1. Installer Node.js 20 ou une version LTS récente.
2. Décompresser le projet.
3. Ouvrir un terminal dans le dossier du projet.
4. Exécuter :

```bash
npm install
cp .env.example .env
npm run dev
```

Ouvrir l'adresse locale indiquée par Vite.

## Connexion à Supabase

1. Créer un projet sur https://supabase.com.
2. Dans SQL Editor, exécuter le fichier `supabase/schema.sql`.
3. Dans Authentication > Users, créer un utilisateur administrateur avec e-mail et mot de passe.
4. Dans Storage, créer un bucket `resource-assets`. Pour des images publiques, le bucket peut être public. Ne pas y déposer de documents confidentiels.
5. Copier l'URL du projet et la clé `anon` publique dans `.env` :

```env
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=ey...
```

6. Redémarrer le serveur.

La clé `anon` est destinée au navigateur et doit rester protégée par les politiques RLS. Ne jamais mettre une clé `service_role` dans le frontend.

## Déploiement

Le projet est compatible avec Vercel :

1. Pousser le dossier vers un dépôt GitHub privé ou public.
2. Importer le dépôt dans Vercel.
3. Définir `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` dans les variables d'environnement Vercel.
4. Déployer.
5. Dans Vercel > Project > Settings > Domains, ajouter `ressources.diaoamadou.site`.
6. Appliquer les enregistrements DNS indiqués par Vercel chez le fournisseur qui gère `diaoamadou.site`.

## Logo DIAO DEV

Le logo officiel n'était pas joint à cette demande de génération. Le prototype utilise donc une marque typographique temporaire « D ». Remplacer le composant `brand-mark` dans `src/App.tsx` par le fichier logo officiel lorsqu'il sera disponible.

## À terminer avant une mise en production publique

Cette livraison est une base applicative réelle, mais une revue de sécurité et des tests restent indispensables :

- Restreindre les opérations administrateur à un rôle dédié (la politique initiale autorise les utilisateurs authentifiés ; ne pas ouvrir l'inscription publique Supabase).
- Ajouter une vérification anti-spam / rate limiting sur la newsletter et le tracking.
- Ajouter un contrôle de validation des URL et des fichiers téléversés.
- Ajouter la gestion réelle des téléversements vers Supabase Storage dans l'interface admin.
- Compléter les statistiques agrégées (périodes, visiteurs uniques, exports).
- Ajouter une page de contact et les pages juridiques avec les coordonnées et textes validés.
- Vérifier les règles RLS avec des comptes anon et admin avant publication.

Ne pas considérer les compteurs de démonstration comme des données réelles. Le mode aperçu utilise des ressources locales tant que Supabase n'est pas configuré.
