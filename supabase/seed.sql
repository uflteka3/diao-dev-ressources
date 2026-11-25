-- Exemples de ressources publiées. Facultatif.
insert into public.resources (title, slug, short_description, description, category, tags, external_url, published)
values
('GitHub', 'github', 'Héberge et partage tes projets de développement.', 'Découvre les dépôts Git, la collaboration et les outils de développement.', 'Ressources GitHub', array['git','code','collaboration'], 'https://github.com', true),
('Supabase', 'supabase', 'Construis le backend de tes applications.', 'Base de données PostgreSQL, authentification et stockage.', 'Outils pour développeurs', array['backend','database','auth'], 'https://supabase.com', true),
('Vercel', 'vercel', 'Déploie tes applications web.', 'Plateforme de déploiement pour les projets web modernes.', 'Sites web gratuits', array['hosting','deployment'], 'https://vercel.com', true)
on conflict (slug) do nothing;
