'use client';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/community';
import { THEMES, DEFAULT_THEME_ID } from '../lib/themes';

const CATS = ['All','General','For Sale & Free','Safety Alert','Recommendation','Event','Lost & Found'];

// A PKCE authorization code may only be redeemed once. React Strict Mode mounts
// effects twice in development, and a fast double render can do the same in
// production, so the exchange is guarded at module scope rather than per mount.
let oauthCodeExchangeStarted = false;

async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  if (file.size > 15 * 1024 * 1024) throw new Error('Images must be 15 MB or smaller.');
  const img = document.createElement('img');
  const canvas = document.createElement('canvas');
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that image.'));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Could not decode that image.'));
    img.src = dataUrl;
  });
  const max = 1200;
  let { width, height } = img;
  if (width > max || height > max) {
    if (width > height) { height = Math.round(height * max / width); width = max; }
    else { width = Math.round(width * max / height); height = max; }
  }
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image processing is not available in this browser.');
  ctx.drawImage(img, 0, 0, width, height);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error('Could not prepare that image.')), 'image/jpeg', 0.78);
  });
  return new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' });
}

async function withTimeout<T>(promise: PromiseLike<T>, ms = 30000): Promise<T> {
  return await Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Upload timed out. Please try the image again.')), ms))
  ]);
}

async function syncCommunityProfile(user:any, fallback?:any){
  if(!user) return null;
  const selectCols='id,auth_user_id,full_name,email,street_address,zip,neighborhood_id,avatar_url,is_admin,is_founder,is_verified';
  const { data: existingRows, error: lookupError } = await supabase
    .from('profiles')
    .select(selectCols)
    .eq('auth_user_id', user.id)
    .order('id', { ascending:true })
    .limit(1);
  const existing = existingRows?.[0] || null;
  if(lookupError) console.warn('Profile lookup warning:', lookupError.message);

  const profile = {
    auth_user_id: user.id,
    full_name: existing?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || fallback?.full_name || user.email?.split('@')[0] || 'Neighbor',
    email: user.email || existing?.email || fallback?.email || '',
    street_address: existing?.street_address ?? fallback?.street_address ?? '',
    zip: existing?.zip ?? fallback?.zip ?? '',
    neighborhood_id: existing?.neighborhood_id ?? fallback?.neighborhood_id ?? null,
    avatar_url: existing?.avatar_url || null,
  };

  let saved:any = null;
  let error:any = null;
  if(existing?.id){
    ({ data: saved, error } = await supabase.from('profiles').update(profile).eq('id', existing.id).select(selectCols).single());
  } else {
    const profileId = globalThis.crypto?.randomUUID?.() || `${user.id}-${Date.now()}`;
    ({ data: saved, error } = await supabase.from('profiles').insert({ id: profileId, ...profile }).select(selectCols).single());
    // A duplicate auth_user_id can happen when an older profile row exists but
    // the initial lookup raced another request. Recover by updating the existing row.
    if(error && (error.code === '23505' || /duplicate/i.test(error.message || ''))){
      const retry = await supabase.from('profiles').select(selectCols).eq('auth_user_id', user.id).order('id',{ascending:true}).limit(1);
      const row = retry.data?.[0];
      if(row?.id){
        const updated = await supabase.from('profiles').update(profile).eq('id', row.id).select(selectCols).single();
        saved = updated.data; error = updated.error;
      }
    }
  }
  if(error){
    console.error('Could not sync community profile:', error);
    return {...fallback, ...profile, ...(existing || {}), user_id:user.id};
  }
  return {...fallback, ...profile, ...(saved || {}), user_id:user.id};
}

export default function Page(){
  const [hoods,setHoods]=useState<any[]>([]);
  const [posts,setPosts]=useState<any[]>([]);
  const [comments,setComments]=useState<Record<string,any[]>>({});
  const [likes,setLikes]=useState<Record<string,any[]>>({});
  const [cLikes,setCLikes]=useState<Record<string,any[]>>({});
  const [openComments,setOpenComments]=useState<Record<string,boolean>>({});
  const [commentText,setCommentText]=useState<Record<string,string>>({});
  const [hood,setHood]=useState('Meadow Brooks Heights');
  const [cat,setCat]=useState('All');
  const [postCategory,setPostCategory]=useState('General');
  const [scope,setScope]=useState<'local'|'kc'>('local');
  const [showExplore,setShowExplore]=useState(false);
  const [body,setBody]=useState('');
  const [profile,setProfile]=useState<any>(null);
  const [showJoin,setShowJoin]=useState(false);
  const [showSettings,setShowSettings]=useState(false);
  const [showFeedback,setShowFeedback]=useState(false);
  const [feedbackText,setFeedbackText]=useState('');
  const [feedbackSending,setFeedbackSending]=useState(false);
  const [feedbackSent,setFeedbackSent]=useState(false);
  const [themeId,setThemeId]=useState(DEFAULT_THEME_ID);
  const [name,setName]=useState('');
  const [email,setEmail]=useState('');
  const [addr,setAddr]=useState('');
  const [file,setFile]=useState<File|null>(null);
  const [uploading,setUploading]=useState(false);
  const [editingPostId,setEditingPostId]=useState<string|null>(null);
  const [editBody,setEditBody]=useState('');
  const [editCategory,setEditCategory]=useState('General');
  const [editFile,setEditFile]=useState<File|null>(null);
  const [editSaving,setEditSaving]=useState(false);
  const editFileInputRef=useRef<HTMLInputElement>(null);
  const [googleLoading,setGoogleLoading]=useState(false);
  const [emailCodeSent,setEmailCodeSent]=useState(false);
  const [emailCode,setEmailCode]=useState('');
  const [emailAuthLoading,setEmailAuthLoading]=useState(false);
  const [emailAuthMessage,setEmailAuthMessage]=useState('');
  const [showThemePicker,setShowThemePicker]=useState(false);
  const [authReady,setAuthReady]=useState(false);
  const [postSuccess,setPostSuccess]=useState(false);
  const [toast,setToast]=useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const postComposerRef = useRef<HTMLTextAreaElement>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [weather,setWeather]=useState<{temp:number;feels:number;precip:number;code:number}|null>(null);
  const [forecast,setForecast]=useState<{date:string;high:number;low:number;code:number}[]>([]);
  const [neighborCount,setNeighborCount]=useState<number|null>(null);
  const [blockedUsers,setBlockedUsers]=useState<Set<string>>(new Set());

  const theme = THEMES[themeId] || THEMES['royals'];
  const headerImage = theme.headerImage || '/neighborly-kc-header-banner.png';
  const cur = hoods.find((x:any)=>x.slug==hood) || hoods[0] || {name:'Meadow Brooks Heights', zip:'64155', id: '5fb249cb-1667-475b-ab8c-43e1df245ace', slug:'meadow-brooks-heights'};
  const bottomInactiveColor = theme.id==='aim' ? '#111111' : theme.id==='pip-boy' ? theme.text : '#ffffff';

  useEffect(()=>{
    const vv=window.visualViewport;
    if(!vv) return;
    const update=()=>{
      const bottom=Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      const keyboardOpen = bottom > 120 || vv.height < window.innerHeight * 0.75;
      document.documentElement.style.setProperty('--nkc-vv-bottom', `${bottom}px`);
      document.documentElement.classList.toggle('nkc-keyboard-open', keyboardOpen);
    };
    update();
    vv.addEventListener('resize',update);
    vv.addEventListener('scroll',update);
    window.addEventListener('resize',update);
    return()=>{
      vv.removeEventListener('resize',update);
      vv.removeEventListener('scroll',update);
      window.removeEventListener('resize',update);
      document.documentElement.classList.remove('nkc-keyboard-open');
    };
  },[]);

  const loadAll = async (postIds:string[]) => {
    if(!postIds.length) return;
    const {data:com}=await supabase.from('comments').select('*').in('post_id', postIds).order('created_at',{ascending:false});
    if(com){
      const g: Record<string,any[]> = {}; com.forEach((c:any)=>{ if(!g[c.post_id]) g[c.post_id]=[]; g[c.post_id].push(c); });
      setComments(g);
      const cIds=com.map((c:any)=>c.id);
      if(cIds.length){ const {data:cl}=await supabase.from('likes').select('*').in('comment_id', cIds); if(cl){ const cg: Record<string,any[]> = {}; cl.forEach((l:any)=>{ if(!cg[l.comment_id]) cg[l.comment_id]=[]; cg[l.comment_id].push(l); }); setCLikes(cg); } }
    }
    const {data:lk}=await supabase.from('likes').select('*').in('post_id', postIds).is('comment_id', null);
    if(lk){ const lg: Record<string,any[]> = {}; lk.forEach((l:any)=>{ if(!lg[l.post_id]) lg[l.post_id]=[]; lg[l.post_id].push(l); }); setLikes(lg); }
  };

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    setEmailAuthMessage('');
    const redirectTo = `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
    if(error){
      setEmailAuthMessage(error.message || 'Google login could not start.');
      setGoogleLoading(false);
    }
  };

  const sendEmailLoginCode = async () => {
    const target = email.trim().toLowerCase();
    if(!target) return setEmailAuthMessage('Enter your email address first.');
    setEmailAuthLoading(true);
    setEmailAuthMessage('');
    const { error } = await supabase.auth.signInWithOtp({
      email: target,
      options: {
        shouldCreateUser: true,
        data: { full_name: name.trim(), street_address: addr.trim(), zip: cur?.zip || '' },
      },
    });
    if(error){
      const msg = error.message || 'Could not start email sign in.';
      setEmailAuthMessage(/database error saving new user/i.test(msg) ? 'Supabase is blocking new accounts right now. Run the included Supabase auth login fix, then try again.' : msg);
    } else {
      setEmailCodeSent(true);
      setEmailAuthMessage(`Check ${target}. We emailed a 6-digit sign-in code. If your email also shows a Sign In link, you can tap that instead.`);
    }
    setEmailAuthLoading(false);
  };

  const verifyEmailLoginCode = async () => {
    const target = email.trim().toLowerCase();
    const token = emailCode.replace(/\D/g, '').slice(0, 6);
    if(token.length !== 6) return setEmailAuthMessage('Enter the 6-digit code from your email.');
    setEmailAuthLoading(true);
    setEmailAuthMessage('');
    const { data, error } = await supabase.auth.verifyOtp({ email: target, token, type: 'email' });
    if(error){
      setEmailAuthMessage(error.message || 'That code is invalid or expired.');
    } else if(data.user){
      await syncCommunityProfile(data.user, { full_name: name.trim(), street_address: addr.trim(), zip: cur?.zip || '' });
      setEmailCode('');
      setEmailCodeSent(false);
      setEmailAuthMessage('Signed in successfully.');
      setShowJoin(false);
    }
    setEmailAuthLoading(false);
  };

  useEffect(()=>{
    const saved = localStorage.getItem('nkc_theme');
    const migrated = saved === 'kc-sunset' ? 'kc-current' : saved;
    setThemeId(migrated && THEMES[migrated] ? migrated : DEFAULT_THEME_ID);
    if(new URLSearchParams(window.location.search).get('signin')==='1') setShowJoin(true);

    let alive = true;
    let subscription: { unsubscribe: () => void } | null = null;

    const applySession = (user:any) => {
      if(!user || !alive) return;
      setGoogleLoading(false);
      setShowJoin(false);
      const quickProfile = {
        user_id:user.id,
        auth_user_id:user.id,
        full_name:user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Neighbor',
        email:user.email || ''
      };
      setProfile((current:any)=>current?.user_id===user.id ? current : quickProfile);
      window.setTimeout(() => {
        void syncCommunityProfile(user).then(pr=>{
          if(alive && pr){
            localStorage.setItem('nkc_profile', JSON.stringify(pr));
            setProfile(pr);
          }
        });
      }, 0);
    };

    const { data } = supabase.auth.onAuthStateChange((event, sess)=>{
      if(!alive) return;
      if(sess?.user){
        applySession(sess.user);
        setAuthReady(true);
      } else if(event === 'SIGNED_OUT'){
        localStorage.removeItem('nkc_profile');
        setProfile(null);
        setShowJoin(false);
        setAuthReady(true);
      }
    });
    subscription = data.subscription;

    (async()=>{
      try {
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        const hash = new URLSearchParams(window.location.hash.replace(/^#/,''));
        const access_token = hash.get('access_token');
        const refresh_token = hash.get('refresh_token');
        if(access_token && refresh_token){
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if(error) console.warn('Hash session adopt warning:', error.message);
          window.history.replaceState({}, '', window.location.pathname);
        }

        if(code && !oauthCodeExchangeStarted){
          oauthCodeExchangeStarted = true;
          const { data: { session: preexisting } } = await supabase.auth.getSession();
          if(!preexisting?.user){
            const { error } = await supabase.auth.exchangeCodeForSession(code);
            if(error) {
              console.warn('OAuth code exchange warning:', error.message);
              const { data: { session: after } } = await supabase.auth.getSession();
              if(!after?.user && alive){
                setShowJoin(true);
                setEmailAuthMessage('Google sign in did not complete. Please try again.');
              }
            }
          }
          window.history.replaceState({}, '', window.location.pathname);
        } else if(code){
          window.history.replaceState({}, '', window.location.pathname);
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if(!alive) return;
        if(error) console.warn('Auth session restore warning:', error.message);
        if(session?.user) applySession(session.user);
      } finally {
        if(alive) setAuthReady(true);
      }
    })();

    const authHash = new URLSearchParams(window.location.hash.replace(/^#/,''));
    const authError = authHash.get('error_description') || authHash.get('error');
    if(authError){
      setShowJoin(true);
      setEmailAuthMessage(authError.replace(/\+/g,' '));
      window.history.replaceState({}, '', window.location.pathname);
    }

    return ()=>{ alive=false; subscription?.unsubscribe(); };
  },[]);

  const postCountRef = useRef(0);

  const loadPublicFeed = async (attempt=0): Promise<void> => {
    const [hoodsResult, postsResult] = await Promise.all([
      supabase.from('neighborhoods').select('*').order('member_count',{ascending:false}),
      supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(50),
    ]);
    if(hoodsResult.data) setHoods(hoodsResult.data);
    if(postsResult.error){
      console.warn('Feed load retry', postsResult.error.message);
      if(attempt < 5) window.setTimeout(()=>void loadPublicFeed(attempt+1), 500 + attempt*500);
      return;
    }
    const rawPosts=postsResult.data || [];
    const ids=[...new Set(rawPosts.map((x:any)=>x.user_id || x.author_id).filter(Boolean))];
    let profileMap=new Map<string,any>();
    if(ids.length){
      const {data:postProfiles}=await supabase.from('profiles').select('auth_user_id,full_name,avatar_url,is_admin,is_founder,is_verified').in('auth_user_id',ids);
      profileMap=new Map((postProfiles||[]).map((x:any)=>[x.auth_user_id,x]));
    }
    const enrichedPosts=rawPosts.map((x:any)=>({...x,profiles:profileMap.get(x.user_id || x.author_id)||x.profiles||null}));
    postCountRef.current=enrichedPosts.length;
    setPosts(enrichedPosts);
    void loadAll(enrichedPosts.map((x:any)=>x.id));
    if(!enrichedPosts.length && attempt < 1) window.setTimeout(()=>void loadPublicFeed(attempt+1), 700);
  };

  useEffect(()=>{
    let cancelled=false;
    void loadPublicFeed();
    const onFocus=()=>{ if(!cancelled && postCountRef.current===0) void loadPublicFeed(); };
    window.addEventListener('focus',onFocus);
    return()=>{ cancelled=true; window.removeEventListener('focus',onFocus); };
  },[]);

  useEffect(()=>{
    let cancelled=false;
    const loadBlocks=async()=>{
      if(!profile?.user_id) { setBlockedUsers(new Set()); return; }
      const {data}=await supabase.from('user_blocks').select('blocked_id').eq('blocker_id',profile.user_id);
      if(!cancelled) setBlockedUsers(new Set((data||[]).map((x:any)=>x.blocked_id)));
    };
    void loadBlocks();
    return()=>{cancelled=true};
  },[profile?.user_id]);

  useEffect(()=>{
    let cancelled=false;
    const loadNeighborCount=async()=>{
      const neighborhoodId=cur?.id;
      if(!neighborhoodId){ setNeighborCount(null); return; }
      const {count,error}=await supabase.from('profiles').select('id',{count:'exact',head:true}).eq('neighborhood_id',neighborhoodId);
      if(cancelled) return;
      if(!error && typeof count==='number' && count>0){ setNeighborCount(count); return; }
      const {count:allCount}=await supabase.from('profiles').select('id',{count:'exact',head:true}).not('auth_user_id','is',null);
      if(cancelled) return;
      const fallbackCount=Number(cur?.member_count);
      setNeighborCount(typeof allCount==='number' && allCount>0 ? allCount : (Number.isFinite(fallbackCount)?fallbackCount:(typeof count==='number'?count:0)));
    };
    void loadNeighborCount();
    return()=>{cancelled=true};
  },[cur?.id,cur?.member_count]);

  const setTheme = (id:string)=>{
    const next=THEMES[id] ? id : DEFAULT_THEME_ID;
    setThemeId(next);
    localStorage.setItem('nkc_theme', next);
    setCat('All');
    setShowExplore(false);
    setShowThemePicker(false);
    setShowSettings(false);
    void loadPublicFeed();
  };

  useEffect(()=>{
    let alive=true;
    const loadWeather=async()=>{
      try{
        const res=await fetch('https://api.open-meteo.com/v1/forecast?latitude=39.0997&longitude=-94.5786&current=temperature_2m,apparent_temperature,precipitation,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code&temperature_unit=fahrenheit&precipitation_unit=inch&timezone=America%2FChicago&forecast_days=7',{cache:'no-store'});
        if(!res.ok) throw new Error('weather request failed');
        const data=await res.json();
        const c=data?.current;
        const d=data?.daily;
        if(alive && c) setWeather({temp:Number(c.temperature_2m),feels:Number(c.apparent_temperature),precip:Number(c.precipitation),code:Number(c.weather_code)});
        if(alive && d?.time) setForecast(d.time.slice(0,7).map((date:string,i:number)=>({
          date,
          high:Number(d.temperature_2m_max?.[i]),
          low:Number(d.temperature_2m_min?.[i]),
          code:Number(d.weather_code?.[i])
        })).filter((x:any)=>Number.isFinite(x.high)&&Number.isFinite(x.low)));
      }catch{}
    };
    loadWeather();
    const timer=window.setInterval(loadWeather,10*60*1000);
    return()=>{alive=false;window.clearInterval(timer)};
  },[]);
  
  const signOut = async () => { localStorage.removeItem('nkc_profile'); await supabase.auth.signOut(); setProfile(null); setShowSettings(false); };
  
  const submitFeedback = async () => {
    const text = feedbackText.trim();
    if (!text || !profile) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return setShowJoin(true);
    setFeedbackSending(true);
    try {
      const res = await fetch('/api/feedback', { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${session.access_token}`}, body:JSON.stringify({message:text}) });
      const data = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(data.error || 'Could not send feedback.');
      setFeedbackText(''); setFeedbackSent(true); setShowFeedback(false); setShowSettings(false);
      window.setTimeout(()=>setFeedbackSent(false), 3500);
    } catch(e:any) { alert(e.message || 'Could not send feedback.'); }
    finally { setFeedbackSending(false); }
  };

  const scopedPosts = scope==='local'
    ? (hoods.length===0 ? posts : posts.filter((p:any)=>!p.neighborhood_id || String(p.neighborhood_id)===String(cur?.id||'')))
    : posts;
  const visiblePosts = scopedPosts.filter((p:any)=>{ const id=p.user_id||p.author_id; return !id || !blockedUsers.has(id); });
  const filtered = cat==='All'? visiblePosts : visiblePosts.filter((p:any)=>p.category===cat);
  const neighborhoodName = (id:any) => hoods.find((h:any)=>String(h.id)===String(id))?.name || cur?.name || 'Kansas City';
  const contributorCounts = posts.reduce((acc:any,p:any)=>{
    const id=p.user_id||p.author_id;
    if(id) acc[id]=(acc[id]||0)+1;
    return acc;
  },{});
  const topContributorIds = new Set(Object.entries(contributorCounts)
    .sort((a:any,b:any)=>Number(b[1])-Number(a[1]))
    .slice(0,3)
    .filter(([,count]:any)=>Number(count)>=3)
    .map(([id])=>id));
  const weatherEmoji = (code:number) => code===0?'☀️':code<=3?'🌤️':code<=48?'🌫️':code<=67?'🌧️':code<=77?'❄️':code<=82?'🌦️':'⛈️';
  const forecastDay = (date:string,i:number) => i===0?'Today':new Date(`${date}T12:00:00`).toLocaleDateString('en-US',{weekday:'short'});
  const isAdmin = Boolean(profile?.is_admin || profile?.is_founder);
  const POST_LIMIT_24H = 5;

  const getRecentPostCount = async (userId:string) => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error } = await supabase.from('posts').select('id', { count:'exact', head:true }).eq('user_id', userId).gte('created_at', since);
    if(error) return 0;
    return count || 0;
  };

  const handleBePost = async () => {
    if (!profile) return setShowJoin(true);
    if (!body.trim() && !file) return;
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) { alert('You must be signed in to post'); return; }
    if (!isAdmin) {
      const recentCount = await getRecentPostCount(currentUser.id);
      if (recentCount >= POST_LIMIT_24H) {
        alert(`You can make up to ${POST_LIMIT_24H} posts in 24 hours. Please try again later.`);
        return;
      }
    }
    setUploading(true);
    try {
      let image_url: string | null = null;
      if (file) {
        const compressed = await compressImage(file);
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const { error: upErr } = await withTimeout(supabase.storage.from('post-images').upload(path, compressed), 30000);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from('post-images').getPublicUrl(path);
        image_url = publicUrl;
      }
      const realId = hoods?.find((x: any) => x.slug == hood)?.id || cur?.id || '5fb249cb-1667-475b-ab8c-43e1df245ace';
      const user = currentUser;
      const { data, error } = await supabase.from('posts').insert({
        body,
        category: postCategory,
        user_id: user.id,
        author_id: user.id,
        neighborhood_id: realId,
        image_url,
        author_name: profile?.full_name || 'Neighbor'
      }).select().single();

      if (error) throw error;
      setPosts([{ ...data, profiles: { full_name: profile.full_name, avatar_url: profile.avatar_url || null } }, ...posts]);
      setBody('');
      setPostCategory('General');
      setCat('All');
      setShowExplore(false);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      document.documentElement.classList.remove('nkc-keyboard-open');
      postComposerRef.current?.blur();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      setPostSuccess(true);
      window.setTimeout(() => setPostSuccess(false), 2600);
    } catch (e: any) {
      alert('Could not save: ' + (e.message || e));
    } finally {
      setUploading(false);
    }
  };

  const addComment = async (postId:string) => { 
    if(!profile) return setShowJoin(true); 
    const text=commentText[postId]?.trim(); 
    if(!text) return; 
    const {data, error}=await supabase.from('comments').insert({ 
      post_id: postId, 
      content:text,  // Using 'content' only - remove 'body'
      author_name:profile.full_name, 
      author_id:profile.user_id 
    }).select().single(); 
    if(error) return alert(error.message); 
    setComments((prev)=> ({...prev, [postId]: [data,...(prev[postId]||[])]})); 
    setCommentText((prev)=>({...prev,[postId]:''})); 
  };

  const togglePostLike = async (postId:string) => {
    if(!profile) return setShowJoin(true);
    const { data: { user } } = await supabase.auth.getUser();
    const authorId = user?.id || profile?.user_id;
    if(!authorId) return setShowJoin(true);
    const list = likes[postId] || [];
    const myLike = list.find((l:any)=>l.author_id===authorId || l.author_name===profile.full_name);
    if(myLike){
      const { error } = await supabase.from('likes').delete().eq('id', myLike.id);
      if(error) return alert('Could not update like: ' + error.message);
      setLikes(prev=>({...prev, [postId]:(prev[postId]||[]).filter((x:any)=>x.id!==myLike.id)}));
    } else {
      const { data, error } = await supabase.from('likes').insert({post_id:postId, author_name:profile.full_name, author_id:authorId}).select().single();
      if(error) return alert('Could not like this post: ' + error.message);
      if(data) { setLikes(prev=>({...prev, [postId]:[...(prev[postId]||[]), data]})); const {data:{session}}=await supabase.auth.getSession(); if(session?.access_token) void fetch('/api/notify-reaction',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({postId})}).catch(()=>{}); }
    }
  };

  const toggleCommentLike = async (commentId:string) => {
    if(!profile) return setShowJoin(true);
    const { data: { user } } = await supabase.auth.getUser();
    const authorId = user?.id || profile?.user_id;
    if(!authorId) return setShowJoin(true);
    const list = cLikes[commentId] || [];
    const myLike = list.find((l:any)=>l.author_id===authorId || l.author_name===profile.full_name);
    if(myLike){
      const { error } = await supabase.from('likes').delete().eq('id', myLike.id);
      if(error) return alert('Could not update like: ' + error.message);
      setCLikes(prev=>({...prev, [commentId]:(prev[commentId]||[]).filter((x:any)=>x.id!==myLike.id)}));
    } else {
      const { data, error } = await supabase.from('likes').insert({comment_id:commentId, author_name:profile.full_name, author_id:authorId}).select().single();
      if(error) return alert('Could not like this comment: ' + error.message);
      if(data) setCLikes(prev=>({...prev, [commentId]:[...(prev[commentId]||[]), data]}));
    }
  };

  const beginEdit = (p:any) => { 
    setEditingPostId(p.id); 
    setEditBody(p.body || p.content || ''); 
    setEditCategory(p.category || 'General'); 
    setEditFile(null); 
    if(editFileInputRef.current) editFileInputRef.current.value=''; 
  };

  const cancelEdit = () => { 
    setEditingPostId(null); 
    setEditBody(''); 
    setEditCategory('General'); 
    setEditFile(null); 
    if(editFileInputRef.current) editFileInputRef.current.value=''; 
  };

  // FIXED: Removed 'content' column from update
  const savePostEdit = async (post:any) => {
    if(!profile || !editBody.trim()) return;
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return setShowJoin(true);
    const isOwner = post.user_id===user.id || (!post.user_id && post.author_name===profile.full_name);
    if(!isOwner && !isAdmin) return alert('You can only edit your own posts.');
    setEditSaving(true);
    try {
      let image_url=post.image_url || null;
      if(editFile){ 
        const compressed=await compressImage(editFile); 
        const path=`${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`; 
        const {error:upErr}=await withTimeout(supabase.storage.from('post-images').upload(path,compressed),30000); 
        if(upErr) throw upErr; 
        image_url=supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl; 
        if(post.image_url){ 
          const oldPath=post.image_url.split('/post-images/')[1]; 
          if(oldPath) await supabase.storage.from('post-images').remove([oldPath]); 
        } 
      }
      // FIX: Only update 'body', not 'content'
      const updatePayload={body:editBody.trim(),category:editCategory,image_url};
      const {error}=await supabase.from('posts').update(updatePayload).eq('id',post.id);
      if(error) throw error;
      const {data:saved,error:readError}=await supabase.from('posts').select('*').eq('id',post.id).maybeSingle();
      if(readError) throw readError;
      setPosts(prev=>prev.map((x:any)=>x.id===post.id?{...x,...(saved||updatePayload)}:x));
      cancelEdit();
      setToast('✓ Post
