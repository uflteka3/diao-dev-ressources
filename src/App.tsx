import { useEffect, useMemo, useState } from 'react'
import { Search, ArrowUpRight, Sparkles, Menu, X, SlidersHorizontal, ExternalLink, Download, Eye, MousePointerClick, FileText, LayoutDashboard, Plus, LogOut, Trash2, Pencil, Lock, Mail, ChevronRight, Github, Globe, Zap } from 'lucide-react'
import { supabase, hasSupabase } from './lib/supabase'
import { categories, demoResources } from './data/demo'
import type { Resource } from './types'

type Tab = 'home' | 'catalogue' | 'admin'
const blankForm = { title:'', slug:'', short_description:'', description:'', category:categories[0], tags:'', cover_url:'', external_url:'', file_url:'', is_paid:false, price:'', purchase_url:'', published:true }

export default function App() {
  const [resources, setResources] = useState<Resource[]>(demoResources)
  const [tab, setTab] = useState<Tab>('home')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Toutes')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [selected, setSelected] = useState<Resource | null>(null)
  const [session, setSession] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [form, setForm] = useState(blankForm)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adminMessage, setAdminMessage] = useState('')
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterMessage, setNewsletterMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const liveMode = hasSupabase && Boolean(supabase)

  async function loadResources() {
    if (!supabase) return
    const { data, error } = await supabase.from('resources').select('*').eq('published', true).order('created_at', { ascending:false })
    if (!error && data) setResources(data as Resource[])
  }
  useEffect(() => {
    loadResources()
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let active = true
    async function checkAdminRole() {
      if (!supabase || !session?.user?.id) { setIsAdmin(false); return }
      const { data, error } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
      if (active) setIsAdmin(!error && data?.role === 'admin')
    }
    checkAdminRole()
    return () => { active = false }
  }, [session])

  const visible = useMemo(() => resources.filter(r => {
    const matchesCategory = category === 'Toutes' || r.category === category
    const haystack = `${r.title} ${r.short_description} ${r.description} ${r.category} ${r.tags.join(' ')}`.toLowerCase()
    return matchesCategory && haystack.includes(query.toLowerCase())
  }), [resources, category, query])

  async function track(id: string, event: 'view'|'click'|'download') {
    if (id.startsWith('demo-') || !supabase) return
    await supabase.rpc('track_resource_event', { resource_id: id, event_type: event })
  }
  function openResource(r: Resource) { setSelected(r); track(r.id, 'view') }
  async function signIn(e: React.FormEvent) {
    e.preventDefault(); setLoginError('')
    if (!supabase) { setLoginError('Configure Supabase pour activer la connexion administrateur.'); return }
    const { error } = await supabase.auth.signInWithPassword({ email:loginEmail, password:loginPassword })
    if (error) setLoginError(error.message)
  }
  async function signOut() { await supabase?.auth.signOut(); setTab('home') }
  async function uploadCoverImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setAdminMessage('Choisis un fichier image.')
      e.target.value = ''
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setAdminMessage('Image trop volumineuse : maximum 5 Mo.')
      e.target.value = ''
      return
    }

    if (!supabase || !isAdmin) {
      setAdminMessage('Connecte-toi comme administrateur.')
      e.target.value = ''
      return
    }

    setUploadingImage(true)
    setAdminMessage('')

    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const filePath = 'covers/' + crypto.randomUUID() + '.' + extension

    const { error } = await supabase.storage
      .from('resource-assets')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (error) {
      setAdminMessage('Erreur d’envoi : ' + error.message)
    } else {
      const { data } = supabase.storage
        .from('resource-assets')
        .getPublicUrl(filePath)

      setForm(current => ({ ...current, cover_url: data.publicUrl }))
      setAdminMessage('Image envoyée avec succès !')
    }

    setUploadingImage(false)
    e.target.value = ''
  }

  async function saveResource(e: React.FormEvent) {
    e.preventDefault(); setAdminMessage('')
    if (!supabase || !isAdmin) return
    setLoading(true)
    if (form.is_paid && (!form.price || Number(form.price) <= 0 || !form.purchase_url.trim())) { setAdminMessage('Pour une ressource payante, renseigne un prix valide et le lien Maketou.'); return }
    const payload = { ...form, tags:form.tags.split(',').map(t=>t.trim()).filter(Boolean), cover_url:form.cover_url || null, external_url:form.external_url || null, file_url:form.is_paid ? null : (form.file_url || null), is_paid:form.is_paid, price:form.is_paid ? Number(form.price) : null, purchase_url:form.is_paid ? form.purchase_url.trim() : null }
    const result = editingId
      ? await supabase.from('resources').update(payload).eq('id', editingId)
      : await supabase.from('resources').insert(payload)
    setLoading(false)
    if (result.error) { setAdminMessage(result.error.message); return }
    setAdminMessage('Ressource enregistrée.')
    setForm(blankForm); setEditingId(null); loadResources()
  }
  function editResource(r: Resource) {
    setEditingId(r.id)
    setForm({ title:r.title, slug:r.slug, short_description:r.short_description, description:r.description, category:r.category, tags:r.tags.join(', '), cover_url:r.cover_url || '', external_url:r.external_url || '', file_url:r.file_url || '', is_paid:Boolean(r.is_paid), price:r.price ? String(r.price) : '', purchase_url:r.purchase_url || '', published:r.published })
    window.scrollTo({ top:0, behavior:'smooth' })
  }
  async function deleteResource(id: string) {
    if (!supabase || !confirm('Supprimer définitivement cette ressource ?')) return
    const { error } = await supabase.from('resources').delete().eq('id', id)
    setAdminMessage(error ? error.message : 'Ressource supprimée.')
    loadResources()
  }
  async function subscribe(e: React.FormEvent) {
    e.preventDefault(); setNewsletterMessage('')
    if (!supabase) { setNewsletterMessage('Les inscriptions seront activées après la connexion à Supabase.'); return }
    const { error } = await supabase.from('newsletter_subscribers').insert({ email:newsletterEmail, consent:true })
    setNewsletterMessage(error ? (error.code === '23505' ? 'Cette adresse est déjà inscrite.' : error.message) : 'Merci ! Ton inscription est enregistrée.')
    if (!error) setNewsletterEmail('')
  }

  const go = (next: Tab) => { setTab(next); setSelected(null); setMobileMenu(false); window.scrollTo({top:0,behavior:'smooth'}) }
  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" onClick={e=>{e.preventDefault();go('home')}}><img className="brand-photo" src="/diao-profil.png" alt="DIAO DEV" /><span>DIAO DEV <b>RESSOURCES</b></span></a>
      <nav className="desktop-nav"><button className={tab==='home'?'active':''} onClick={()=>go('home')}>Accueil</button><button className={tab==='catalogue'?'active':''} onClick={()=>go('catalogue')}>Explorer</button><button onClick={()=>go('admin')}>Administration</button></nav>
      <div className="top-actions"><span className="free-pill"><span/> Gratuit &amp; premium</span><button className="menu-btn" onClick={()=>setMobileMenu(!mobileMenu)} aria-label="Menu">{mobileMenu?<X/>:<Menu/>}</button></div>
    </header>
    {mobileMenu && <div className="mobile-nav"><button onClick={()=>go('home')}>Accueil</button><button onClick={()=>go('catalogue')}>Explorer les ressources</button><button onClick={()=>go('admin')}>Administration</button></div>}
    {tab !== 'admin' && !selected && <main>
      {tab==='home' && <section className="hero">
        <div className="hero-glow"/>
        <div className="eyebrow"><Sparkles size={14}/> LA BIBLIOTHÈQUE NUMÉRIQUE DE DIAO DEV</div>
        <h1>Les bonnes ressources.<br/><span>Au bon endroit.</span></h1>
        <p className="hero-copy">Retrouve les outils, sites, IA, prompts et fichiers présentés dans mes contenus. Certaines ressources sont gratuites, d’autres accessibles à petit prix.</p>
        <div className="search-wrap"><Search size={21}/><input value={query} onChange={e=>{setQuery(e.target.value);setTab('catalogue')}} placeholder="Que recherches-tu aujourd'hui ?"/><kbd>↵</kbd></div>
        <div className="hero-meta"><span><Zap size={15}/> Accès immédiat</span><span><Lock size={14}/> Accès gratuit ou achat via Maketou</span><span><Globe size={14}/> Ressources sélectionnées</span></div>
      </section>}
      <section className="content-section">
        <div className="section-heading"><div><div className="eyebrow muted">{tab==='home'?'SÉLECTION DIAO DEV':'BIBLIOTHÈQUE'}</div><h2>{tab==='home'?'Explore les ressources':'Toutes les ressources'}</h2><p>Des ressources utiles pour apprendre, créer et développer tes projets.</p></div><button className="text-link" onClick={()=>go('catalogue')}>Tout explorer <ArrowUpRight size={16}/></button></div>
        <div className="filter-row"><button className={category==='Toutes'?'filter active-filter':'filter'} onClick={()=>setCategory('Toutes')}>Toutes</button>{categories.map(c=><button key={c} className={category===c?'filter active-filter':'filter'} onClick={()=>{setCategory(c);setTab('catalogue')}}>{c}</button>)}</div>
        <div className="results-line"><span>{visible.length} ressource{visible.length>1?'s':''}</span><span><SlidersHorizontal size={14}/> Recherche et catégories</span></div>
        <div className="resource-grid">{visible.map(r=><ResourceCard key={r.id} resource={r} onOpen={()=>openResource(r)}/>)}</div>
        {visible.length===0 && <div className="empty"><Search size={28}/><h3>Aucun résultat pour le moment</h3><p>Essaie un autre mot-clé ou une autre catégorie.</p><button className="btn-secondary" onClick={()=>{setQuery('');setCategory('Toutes')}}>Réinitialiser les filtres</button></div>}
      </section>
      <section className="newsletter"><div><div className="eyebrow"><Mail size={14}/> RESTONS CONNECTÉS</div><h2>Ne rate aucune nouvelle ressource.</h2><p>Inscris-toi si tu souhaites recevoir les prochaines découvertes de DIAO DEV.</p></div><form onSubmit={subscribe}><input type="email" required placeholder="Ton adresse e-mail" value={newsletterEmail} onChange={e=>setNewsletterEmail(e.target.value)}/><button className="btn-primary">M'inscrire <ArrowUpRight size={16}/></button><small>{newsletterMessage || 'Inscription facultative. Pas de spam.'}</small></form></section>
    </main>}
    {selected && <main className="detail-page"><button className="back-link" onClick={()=>setSelected(null)}>← Retour aux ressources</button><div className="detail-card"><div className="resource-art large-art">{selected.cover_url ? <img src={selected.cover_url} alt={selected.title} style={{width:"100%",height:"100%",objectFit:"cover"}}/> : <><FileText size={44}/><span>RESSOURCE DIAO DEV</span></>}</div><div className="detail-content"><span className="category-label">{selected.category}</span><h1>{selected.title}</h1><p className="detail-short">{selected.short_description}</p><p>{selected.description}</p><div className="tag-list">{selected.tags.map(t=><span key={t}>#{t}</span>)}</div><div className="detail-actions">{selected.is_paid ? <a className="btn-primary" href={selected.purchase_url || '#'} target="_blank" rel="noreferrer" onClick={()=>track(selected.id,'click')}>Acheter via Maketou · {Number(selected.price || 0).toLocaleString('fr-FR')} FCFA <ExternalLink size={16}/></a> : <>{selected.external_url && <a className="btn-primary" href={selected.external_url} target="_blank" rel="noreferrer" onClick={()=>track(selected.id,'click')}>Accéder à la ressource <ExternalLink size={16}/></a>}{selected.file_url && <a className="btn-secondary" href={selected.file_url} target="_blank" rel="noreferrer" onClick={()=>track(selected.id,'download')}>Télécharger gratuitement <Download size={16}/></a>}</>}</div></div></div></main>}
    {tab==='admin' && !selected && <main className="admin-page"><div className="section-heading"><div><div className="eyebrow muted">ESPACE PRIVÉ</div><h2>Administration</h2><p>Gère les ressources de ta bibliothèque.</p></div>{isAdmin && <button className="btn-secondary" onClick={signOut}><LogOut size={15}/> Déconnexion</button>}</div>
      {!isAdmin ? <form className="login-card" onSubmit={signIn}><div className="login-icon"><Lock/></div><h3>Connexion administrateur</h3><p>Connecte-toi avec le compte administrateur créé dans Supabase.</p><label>Adresse e-mail<input type="email" required value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="admin@exemple.com"/></label><label>Mot de passe<input type="password" required value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="Ton mot de passe"/></label>{loginError && <p className="error">{loginError}</p>}<button className="btn-primary full-btn">Se connecter</button>{!liveMode && <p className="notice">Mode aperçu : configure Supabase pour activer l'administration réelle.</p>}</form> :
      <><div className="stats-grid"><Stat icon={<FileText/>} label="Ressources publiées" value={resources.length}/><Stat icon={<Eye/>} label="Consultations (aperçu)" value={resources.reduce((a,r)=>a+r.views,0)}/><Stat icon={<MousePointerClick/>} label="Clics (aperçu)" value={resources.reduce((a,r)=>a+r.clicks,0)}/></div>
      <form className="resource-form" onSubmit={saveResource}><h3>{editingId?'Modifier une ressource':'Ajouter une ressource'}</h3><div className="form-grid"><label>Titre<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value,slug:form.slug || slugify(e.target.value)})}/></label><label>Slug URL<input required value={form.slug} onChange={e=>setForm({...form,slug:slugify(e.target.value)})}/></label><label>Catégorie<select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Mots-clés (séparés par des virgules)<input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="IA, productivité, gratuit"/></label><label className="wide">Description courte<input required value={form.short_description} onChange={e=>setForm({...form,short_description:e.target.value})}/></label><label className="wide">Description détaillée<textarea rows={4} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Choisir une image depuis le téléphone<input type="file" accept="image/*" onChange={uploadCoverImage} disabled={uploadingImage}/><small>{uploadingImage ? 'Envoi de l’image…' : 'Image JPG, PNG ou WebP · 5 Mo maximum'}</small></label><label>Ou coller l’URL de l’image<input type="url" value={form.cover_url} onChange={e=>setForm({...form,cover_url:e.target.value})} placeholder="https://..."/></label><label>Lien externe (ressource gratuite)<input type="url" value={form.external_url} onChange={e=>setForm({...form,external_url:e.target.value})} placeholder="https://..."/></label><label className="wide">URL du fichier gratuit à télécharger (facultatif)<input type="url" value={form.file_url} onChange={e=>setForm({...form,file_url:e.target.value})} placeholder="https://..."/></label><label className="check-label wide"><input type="checkbox" checked={form.is_paid} onChange={e=>setForm({...form,is_paid:e.target.checked})}/> Cette ressource est payante</label>{form.is_paid && <><label>Prix à afficher (FCFA)<input type="number" min="1" step="1" required value={form.price} onChange={e=>setForm({...form,price:e.target.value})} placeholder="5000"/></label><label>Lien de paiement Maketou<input type="url" required value={form.purchase_url} onChange={e=>setForm({...form,purchase_url:e.target.value})} placeholder="https://..."/><small>Colle ici le lien de paiement de ce produit sur Maketou.</small></label></>}<label className="check-label"><input type="checkbox" checked={form.published} onChange={e=>setForm({...form,published:e.target.checked})}/> Publier immédiatement</label></div><div className="form-buttons"><button className="btn-primary" disabled={loading}>{loading?'Enregistrement…':'Enregistrer la ressource'}</button>{editingId && <button type="button" className="btn-secondary" onClick={()=>{setEditingId(null);setForm(blankForm)}}>Annuler</button>}</div>{adminMessage && <p className="notice">{adminMessage}</p>}</form>
      <div className="admin-list"><h3>Ressources existantes</h3>{resources.map(r=><div className="admin-row" key={r.id}><div><b>{r.title}</b><small>{r.category} · {r.published?'Publiée':'Brouillon'}</small></div><div className="row-actions"><button aria-label="Modifier" onClick={()=>editResource(r)}><Pencil size={16}/></button><button aria-label="Supprimer" onClick={()=>deleteResource(r.id)}><Trash2 size={16}/></button></div></div>)}</div></>}
    </main>}
    <footer><div className="footer-brand"><img className="brand-photo" src="/diao-profil.png" alt="DIAO DEV" /><b>DIAO DEV RESSOURCES</b></div><p>Les ressources utiles pour apprendre, créer et avancer.</p><div className="footer-bottom"><span>© {new Date().getFullYear()} DIAO DEV. Tous droits réservés.</span><span>Conçu avec passion au service des créateurs.</span></div></footer>
  </div>
}

function slugify(s:string) { return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') }
function ResourceCard({resource:r,onOpen}:{resource:Resource,onOpen:()=>void}) {
  return <button className="resource-card" onClick={onOpen}><div className="card-art">{r.cover_url?<img src={r.cover_url} alt=""/>:<div className="art-symbol"><Sparkles size={25}/><span>{r.title.slice(0,1).toUpperCase()}</span></div>}<span className="card-category">{r.category}</span></div><div className="card-body"><h3>{r.title}</h3><p>{r.short_description}</p><div className="card-bottom"><span>{r.is_paid ? <b>{Number(r.price || 0).toLocaleString('fr-FR')} FCFA · Payant</b> : <b>Gratuit</b>}</span><span className="circle-arrow"><ChevronRight size={17}/></span></div></div></button>
}
function Stat({icon,label,value}:{icon:React.ReactNode,label:string,value:number}) { return <div className="stat-card"><span>{icon}</span><div><small>{label}</small><b>{value.toLocaleString('fr-FR')}</b></div></div> }
