'use client';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/community';
import { THEMES, DEFAULT_THEME_ID } from '../lib/themes';

const CATS = ['All','General','For Sale & Free','Safety Alert','Recommendation','Event','Lost & Found'];
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '493019301743-e2djce6rmlpntl05terd0uopslij1gtu.apps.googleusercontent.com';

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
  const googleButtonRef=useRef<HTMLDivElement>(null);
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
  const [isLoading,setIsLoading]=useState(true);
  const [commenting,setCommenting]=useState<Record<string,boolean>>({});
  const [reportingPost,setReportingPost]=useState<any>(null);
  const [reportReason,setReportReason]=useState('Harassment or bullying');
  const [reportDetails,setReportDetails]=useState('');
  const [reportSending,setReportSending]=useState(false);

  const theme = THEMES[themeId] || THEMES['royals'];
  const headerImage = theme.headerImage || '/neighborly-kc-header-banner.png';
  const cur = hoods.find((x:any)=>x.slug==hood) || hoods[0] || {name:'Meadow Brooks Heights', zip:'64155', id: '5fb249cb-1667-475b-ab8c-43e1df245ace', slug:'meadow-brooks-heights'};
  const bottomInactiveColor = theme.id==='aim' ? '#111111' : theme.id==='pip-boy' ? theme.text : '#ffffff';

  useEffect(()=>{
    document.documentElement.style.backgroundColor=theme.bg;
    document.body.style.backgroundColor=theme.bg;
    const themeMeta=document.querySelector('meta[name="theme-color"]');
    themeMeta?.setAttribute('content',theme.header);
  },[theme.bg,theme.header]);

  // Optimized viewport handler with debounce
  useEffect(()=>{
    let timeoutId: NodeJS.Timeout;
    const vv=window.visualViewport;
    if(!vv) return;
    const update=()=>{
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const bottom=Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
        const keyboardOpen = bottom > 120 || vv.height < window.innerHeight * 0.75;
        document.documentElement.style.setProperty('--nkc-vv-bottom', `${bottom}px`);
        document.documentElement.classList.toggle('nkc-keyboard-open', keyboardOpen);
      }, 100);
    };
    update();
    vv.addEventListener('resize',update);
    vv.addEventListener('scroll',update);
    window.addEventListener('resize',update);
    return()=>{
      clearTimeout(timeoutId);
      vv.removeEventListener('resize',update);
      vv.removeEventListener('scroll',update);
      window.removeEventListener('resize',update);
      document.documentElement.classList.remove('nkc-keyboard-open');
    };
  },[]);

  const loadAll = useCallback(async (postIds:string[]) => {
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
  }, []);

  // Use Google's browser button and exchange its ID token directly with
  // Supabase. This keeps the account chooser on Google/NeighborlyKC and avoids
  // advertising the raw project-id.supabase.co callback domain.
  useEffect(()=>{
    if(!showJoin) return;
    let cancelled=false;

    const renderGoogleButton=()=>{
      const google=(window as any).google;
      if(cancelled || !google?.accounts?.id || !googleButtonRef.current) return;
      googleButtonRef.current.innerHTML='';
      google.accounts.id.initialize({
        client_id:GOOGLE_CLIENT_ID,
        callback:async(response:any)=>{
          if(!response?.credential) return;
          setGoogleLoading(true);
          setEmailAuthMessage('');
          const {data,error}=await supabase.auth.signInWithIdToken({
            provider:'google',
            token:response.credential
          });
          if(error){
            setEmailAuthMessage(error.message || 'Google login could not complete.');
            setGoogleLoading(false);
            return;
          }
          if(data.user) {
            const pr=await syncCommunityProfile(data.user);
            if(pr) setProfile(pr);
          }
          setGoogleLoading(false);
          setShowJoin(false);
        }
      });
      google.accounts.id.renderButton(googleButtonRef.current,{
        type:'standard',
        theme:'outline',
        size:'large',
        text:'continue_with',
        shape:'pill',
        logo_alignment:'left',
        width:window.innerWidth < 640 ? Math.max(220,Math.min(280,window.innerWidth-72)) : 320
      });
    };

    const existing=document.getElementById('google-identity-services');
    if((window as any).google?.accounts?.id) renderGoogleButton();
    else if(existing) existing.addEventListener('load',renderGoogleButton,{once:true});
    else {
      const script=document.createElement('script');
      script.id='google-identity-services';
      script.src='https://accounts.google.com/gsi/client';
      script.async=true;
      script.defer=true;
      script.onload=renderGoogleButton;
      script.onerror=()=>setEmailAuthMessage('Could not load Google sign in. Please try email instead.');
      document.head.appendChild(script);
    }
    return()=>{cancelled=true;existing?.removeEventListener('load',renderGoogleButton);};
  },[showJoin]);

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
      // Force profile refresh
      const { data: { user: refreshedUser } } = await supabase.auth.getUser();
      if(refreshedUser) {
        const profile = await syncCommunityProfile(refreshedUser);
        setProfile(profile);
      }
    }
    setEmailAuthLoading(false);
  };

  // Initialize auth once. Re-running this effect when the profile changes can
  // try to redeem the same one-use PKCE code twice and make Google sign-in
  // appear to require a second attempt.
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
      setProfile(quickProfile);

      // Supabase advises keeping onAuthStateChange callbacks lightweight.
      // Complete the database profile sync outside the callback tick.
      window.setTimeout(()=>{
        if(!alive) return;
        syncCommunityProfile(user).then(pr=>{
          if(alive && pr){
            localStorage.setItem('nkc_profile', JSON.stringify(pr));
            setProfile(pr);
          }
        }).catch(err=>console.warn('Profile sync warning:', err));
      },0);
    };

    const finishAuthReady = () => {
      if(!alive) return;
      setAuthReady(true);
      setIsLoading(false);
    };

    const { data } = supabase.auth.onAuthStateChange((event, sess)=>{
      if(!alive) return;
      if(sess?.user){
        applySession(sess.user);
        finishAuthReady();
      } else if(event === 'SIGNED_OUT'){
        localStorage.removeItem('nkc_profile');
        setProfile(null);
        setShowJoin(false);
        finishAuthReady();
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
      } catch(e) {
        console.warn('Auth initialization warning:', e);
      } finally {
        finishAuthReady();
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
  }, []);

  const postCountRef = useRef(0);

  const loadPublicFeed = useCallback(async (attempt=0): Promise<void> => {
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
    await loadAll(enrichedPosts.map((x:any)=>x.id));
    if(!enrichedPosts.length && attempt < 1) window.setTimeout(()=>void loadPublicFeed(attempt+1), 700);
  }, [loadAll]);

  useEffect(()=>{
    let cancelled=false;
    void loadPublicFeed();
    const onFocus=()=>{ if(!cancelled && postCountRef.current===0) void loadPublicFeed(); };
    window.addEventListener('focus',onFocus);
    return()=>{ cancelled=true; window.removeEventListener('focus',onFocus); };
  },[loadPublicFeed]);

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

  const setTheme = useCallback((id:string)=>{
    const next=THEMES[id] ? id : DEFAULT_THEME_ID;
    setThemeId(next);
    localStorage.setItem('nkc_theme', next);
    setCat('All');
    setShowExplore(false);
    setShowThemePicker(false);
    setShowSettings(false);
    void loadPublicFeed();
  }, [loadPublicFeed]);

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
  
  const signOut = async () => { 
    localStorage.removeItem('nkc_profile'); 
    await supabase.auth.signOut(); 
    setProfile(null); 
    setShowSettings(false);
    // Clear any cached auth state
    sessionStorage.clear();
  };
  
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

  const submitPostReport = async () => {
    if(!profile){setReportingPost(null);setShowJoin(true);return;}
    if(!reportingPost?.id || !reportReason) return;
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return setShowJoin(true);
    setReportSending(true);
    try{
      const {error}=await supabase.from('post_reports').insert({post_id:reportingPost.id,reporter_id:user.id,reason:reportReason,details:reportDetails.trim()||null});
      if(error){
        if(error.code==='23505') throw new Error('You already reported this post.');
        throw error;
      }
      setReportingPost(null);setReportDetails('');setReportReason('Harassment or bullying');
      setToast('✓ Report sent to moderators');window.setTimeout(()=>setToast(''),3000);
    }catch(e:any){alert(e.message||'Could not submit report.');}
    finally{setReportSending(false);}
  };

  const viewPostReports = async (post:any) => {
    if(!isAdmin) return;
    const {data,error}=await supabase.from('post_reports').select('reason,details,status,created_at').eq('post_id',post.id).order('created_at',{ascending:false}).limit(20);
    if(error) return alert('Could not load reports: '+error.message);
    if(!data?.length) return alert('This post has no reports.');
    alert(data.map((r:any,i:number)=>`${i+1}. ${r.reason}${r.details?` — ${r.details}`:''} (${r.status})`).join('\n\n'));
  };

  const scopedPosts = useMemo(() => {
    const filtered = scope==='local'
      ? (hoods.length===0 ? posts : posts.filter((p:any)=>!p.neighborhood_id || String(p.neighborhood_id)===String(cur?.id||'')))
      : posts;
    return filtered.filter((p:any)=>{ const id=p.user_id||p.author_id; return !id || !blockedUsers.has(id); });
  }, [scope, posts, hoods, cur?.id, blockedUsers]);

  const filtered = useMemo(() => {
    const matches = cat==='All'? scopedPosts : scopedPosts.filter((p:any)=>p.category===cat);
    return [...matches].sort((a:any,b:any)=>Number(Boolean(b.is_pinned))-Number(Boolean(a.is_pinned)) || new Date(b.created_at).getTime()-new Date(a.created_at).getTime());
  }, [cat, scopedPosts]);

  const neighborhoodName = useCallback((id:any) => hoods.find((h:any)=>String(h.id)===String(id))?.name || cur?.name || 'Kansas City', [hoods, cur?.name]);
  
  const contributorCounts = useMemo(() => {
    return posts.reduce((acc:any,p:any)=>{
      const id=p.user_id||p.author_id;
      if(id) acc[id]=(acc[id]||0)+1;
      return acc;
    },{});
  }, [posts]);
  
  const topContributorIds = useMemo(() => {
    return new Set(Object.entries(contributorCounts)
      .sort((a:any,b:any)=>Number(b[1])-Number(a[1]))
      .slice(0,3)
      .filter(([,count]:any)=>Number(count)>=3)
      .map(([id])=>id));
  }, [contributorCounts]);

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
        const path = `${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const { error: upErr } = await withTimeout(supabase.storage.from('post-images').upload(path, compressed, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: false
        }), 30000);
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

  // FIXED: Comments now work properly
  const addComment = async (postId:string) => { 
    if(!profile) {
      setShowJoin(true);
      return;
    }
    const text=commentText[postId]?.trim(); 
    if(!text) return;
    if(posts.find((p:any)=>p.id===postId)?.comments_locked) return alert('Comments are locked on this post.');
    
    // Prevent duplicate submissions
    if(commenting[postId]) return;
    setCommenting(prev => ({...prev, [postId]: true}));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if(!user) {
        setShowJoin(true);
        return;
      }
      
      const { data, error } = await supabase.from('comments').insert({ 
        post_id: postId, 
        content: text,
        body: text, // Add both for compatibility
        author_name: profile.full_name, 
        author_id: user.id
      }).select().single(); 
      
      if(error) {
        console.error('Comment error:', error);
        alert('Could not post comment: ' + error.message);
        return;
      }
      
      if(data) {
        setComments(prev => ({ 
          ...prev, 
          [postId]: [data, ...(prev[postId] || [])]
        }));
        setCommentText(prev => ({...prev, [postId]: ''}));
      }
    } catch(e: any) {
      alert('Could not post comment: ' + (e.message || 'Unknown error'));
    } finally {
      setCommenting(prev => ({...prev, [postId]: false}));
    }
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

  const savePostEdit = async (post:any) => {
    if(!profile || !editBody.trim()) return;
    const {data:{user}}=await supabase.auth.getUser();
    if(!user) return setShowJoin(true);
    const isOwner = post.user_id===user.id || (!post.user_id && post.author_name===profile.full_name);
    if(!isOwner && !isAdmin) return alert('You can only edit your own posts.');
    const moderationReason=!isOwner&&isAdmin ? prompt('Reason for moderator edit:','Corrected for community standards')?.trim() : '';
    if(!isOwner&&isAdmin&&!moderationReason) return;
    setEditSaving(true);
    try {
      let image_url=post.image_url || null;
      if(editFile){ 
        const compressed=await compressImage(editFile); 
        const { data: { user: editUser } } = await supabase.auth.getUser();
        if(!editUser) throw new Error('You must be signed in to replace an image.');
        const path=`${editUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`; 
        const {error:upErr}=await withTimeout(supabase.storage.from('post-images').upload(path,compressed,{contentType:'image/jpeg',cacheControl:'3600',upsert:false}),30000); 
        if(upErr) throw upErr; 
        image_url=supabase.storage.from('post-images').getPublicUrl(path).data.publicUrl; 
        if(post.image_url){ 
          const oldPath=post.image_url.split('/post-images/')[1]; 
          if(oldPath) await supabase.storage.from('post-images').remove([oldPath]); 
        } 
      }
      const updatePayload:any={body:editBody.trim(),category:editCategory,image_url};
      if(!isOwner&&isAdmin){ updatePayload.moderator_edited_at=new Date().toISOString(); updatePayload.moderator_edited_by=user.id; }
      const {error}=await supabase.from('posts').update(updatePayload).eq('id',post.id);
      if(error) throw error;
      if(!isOwner&&isAdmin) await recordModerationAction('moderator_edit',post,moderationReason||'Moderator edit');
      const {data:saved,error:readError}=await supabase.from('posts').select('*').eq('id',post.id).maybeSingle();
      if(readError) throw readError;
      setPosts(prev=>prev.map((x:any)=>x.id===post.id?{...x,...(saved||updatePayload)}:x));
      cancelEdit();
      setToast('✓ Post updated');
      window.setTimeout(()=>setToast(''),2600);
    } catch(e:any) { alert('Could not update post: '+(e.message||e)); } finally { setEditSaving(false); }
  };

  const recordModerationAction = async (action:string, post:any, reason:string, expiresAt:string|null=null) => {
    if(!isAdmin || !profile?.user_id) throw new Error('Administrator access is required.');
    const targetUserId=post?.user_id||post?.author_id||null;
    const {error}=await supabase.from('moderation_actions').insert({
      moderator_id:profile.user_id,
      target_user_id:targetUserId,
      post_id:post?.id||null,
      action,
      reason,
      expires_at:expiresAt
    });
    if(error) throw error;
  };

  const deletePost = async (id:string, image_url:string|null, post?:any) => { 
    if(!confirm('Delete this post?')) return; 
    const reason=isAdmin ? prompt('Reason for removing this post:','Community standards')?.trim() : '';
    if(isAdmin && !reason) return;
    if(isAdmin && post){
      try { await recordModerationAction('post_removed',post,reason||'Community standards'); }
      catch(e:any){ return alert('Could not record moderation action: '+(e.message||e)); }
    }
    if(image_url){ 
      const path = image_url.split('/post-images/')[1]; 
      if(path) await supabase.storage.from('post-images').remove([path]); 
    } 
    const {error}=await supabase.from('posts').delete().eq('id', id); 
    if(error) return alert('Could not delete post: '+error.message); 
    setPosts(prev=>prev.filter((p:any)=>p.id!==id)); 
  };

  const togglePostModeration = async (post:any,field:'comments_locked'|'is_pinned',label:string) => {
    if(!isAdmin) return;
    const next=!Boolean(post[field]);
    const reason=prompt(`Reason to ${label.toLowerCase()}:`,'Community moderation')?.trim();
    if(!reason) return;
    try{
      const {error}=await supabase.from('posts').update({[field]:next}).eq('id',post.id);
      if(error) throw error;
      const auditAction=field==='comments_locked'?(next?'comments_locked':'comments_unlocked'):(next?'post_pinned':'post_unpinned');
      await recordModerationAction(auditAction,post,reason);
      setPosts(prev=>prev.map((p:any)=>p.id===post.id?{...p,[field]:next}:p));
      setToast(`✓ ${label}`);
      window.setTimeout(()=>setToast(''),2600);
    }catch(e:any){alert('Moderation action failed: '+(e.message||e));}
  };

  const moderateMember = async (action:'warn'|'mute'|'ban',post:any) => {
    if(!isAdmin) return;
    const userName=post.profiles?.full_name||post.author_name||'this member';
    const target=post.user_id||post.author_id;
    if(!target || target===profile?.user_id) return alert('You cannot moderate your own account.');
    const reason=prompt(`Reason to ${action} ${userName}:`,'Community standards')?.trim();
    if(!reason) return;
    let expiresAt:string|null=null;
    if(action==='mute'){
      const hours=Math.max(1,Math.min(720,Number(prompt('Mute for how many hours?','24'))||24));
      expiresAt=new Date(Date.now()+hours*60*60*1000).toISOString();
    }
    if(action==='ban' && !confirm(`Ban ${userName}? They will no longer be able to post or comment.`)) return;
    try{
      await recordModerationAction(action,post,reason,expiresAt);
      if(action==='ban') setBlockedUsers(prev=>new Set([...prev,target]));
      setToast(`✓ ${userName} ${action==='warn'?'warned':action==='mute'?'muted':'banned'}`);
      window.setTimeout(()=>setToast(''),3000);
    }catch(e:any){alert('Moderation action failed: '+(e.message||e));}
  };

  const deleteComment = async (id:string, postId:string) => { 
    if(!confirm('Delete comment?')) return; 
    const {error}=await supabase.from('comments').delete().eq('id', id); 
    if(error)return alert(error.message); 
    setComments((prev)=>({...prev, [postId]: prev[postId].filter((c:any)=>c.id!==id)})); 
  };

  // Loading state
  if(isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: theme.bg}}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{borderColor: theme.accent, borderTopColor: 'transparent'}}></div>
          <p style={{color: theme.text}}>Loading Neighborly KC...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden nkc-app-shell" style={{backgroundColor: theme.bg, color: theme.text, colorScheme: theme.id==='aim' ? 'light' : 'dark'}}>
      <header className="relative z-40 overflow-hidden border-b nkc-main-header sm:hidden" style={{backgroundColor: theme.header, borderColor: theme.border}}>
        <div className="nkc-header-banner-wrap">
          <button type="button" className="block nkc-header-banner-link" aria-label="Neighborly KC home" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>
            <img src={headerImage} alt="Neighborly KC" className="nkc-header-banner" draggable="false" />
          </button>
        </div>
        <div className="nkc-mobile-account-row" aria-label="Account controls" style={{backgroundColor:theme.header,borderColor:theme.border}}>
          {profile
            ? <button type="button" onClick={signOut} className="nkc-mobile-account-btn">↪ <span>Sign out</span></button>
            : <button type="button" onClick={()=>setShowJoin(true)} className="nkc-mobile-account-btn">👤 <span>Sign in</span></button>}
          <a href="/dms" className="nkc-mobile-account-btn">💬 <span>Messages</span></a>
          {profile
            ? <a href="/profile" className="nkc-mobile-account-btn">🙂 <span>Profile</span></a>
            : <button type="button" onClick={()=>setShowJoin(true)} className="nkc-mobile-account-btn">🙂 <span>Profile</span></button>}
          <button type="button" onClick={()=>setShowSettings(true)} className="nkc-mobile-account-btn">🎨 <span>Themes</span></button>
        </div>
      </header>

      <header className="hidden sm:block relative z-40 overflow-hidden border-b nkc-main-header" style={{backgroundColor: theme.header, borderColor: 'rgba(255,255,255,.12)'}}>
        <div className="nkc-header-banner-wrap">
          <button type="button" className="block nkc-header-banner-link" aria-label="Neighborly KC home" onClick={()=>window.scrollTo({top:0,behavior:'smooth'})}>
            <img src={headerImage} alt="Neighborly KC" className="nkc-header-banner" draggable="false" />
          </button>
          <div className="nkc-header-controls" aria-label="Account controls">
            {profile
              ? <button type="button" onClick={signOut} className="nkc-header-control">↪ Sign out</button>
              : <button type="button" onClick={()=>setShowJoin(true)} className="nkc-header-control">👤 Sign in</button>}
            <a href="/dms" className="nkc-header-control">💬 Messages</a>
            {profile
              ? <a href="/profile" className="nkc-header-control">🙂 Profile</a>
              : <button type="button" onClick={()=>setShowJoin(true)} className="nkc-header-control">🙂 Profile</button>}
            <button type="button" onClick={()=>setShowSettings(true)} className="nkc-header-control">🎨 Themes</button>
          </div>
        </div>
      </header>

      <section className="nkc-forecast-banner" aria-label="7 day Kansas City forecast" style={{backgroundColor:theme.input,color:theme.text,borderColor:theme.border}}>
        <div className="nkc-forecast-inner">
          <div className="nkc-forecast-title">
            <span>🌤️ <b>KC 7-DAY FORECAST</b></span>
            {weather && <span className="nkc-forecast-now">Now {Math.round(weather.temp)}° · feels {Math.round(weather.feels)}°</span>}
          </div>
          <div className="nkc-forecast-days">
            {forecast.length ? forecast.map((f,i)=><div key={f.date} className="nkc-forecast-day" style={{backgroundColor:theme.card,borderColor:theme.border}}>
              <b>{forecastDay(f.date,i)}</b><span className="nkc-forecast-icon">{weatherEmoji(f.code)}</span><strong>{Math.round(f.high)}°</strong><span className="nkc-forecast-low">{Math.round(f.low)}°</span>
            </div>) : <div className="nkc-forecast-loading">Loading Kansas City forecast…</div>}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-8 grid grid-cols-1 lg:grid-cols-[220px_1fr_300px] gap-4 sm:gap-6 nkc-page-content">
        <aside className="rounded-2xl p-3 h-fit border hidden lg:block" style={{backgroundColor: theme.card, borderColor: theme.border}}>
          <p className="text-xs font-bold px-3 py-2 opacity-40">FILTER</p>
          {CATS.map(c=><button key={c} onClick={()=>setCat(c)} className="w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors" style={{backgroundColor: cat===c? theme.accent : 'transparent', color: cat===c? theme.pillTextActive : theme.text}}>{c}</button>)}
        </aside>

        <main className="space-y-3">
          <div className="rounded-2xl p-4 border nkc-surface nkc-fade-in" style={{backgroundColor: theme.card, borderColor: theme.border}}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div><p className="text-xs font-black uppercase tracking-wider opacity-50">Neighborly KC Network</p><h2 className="text-xl font-black">{scope==='local'?cur?.name:'All Kansas City'}</h2><p className="text-xs opacity-55">{scope==='local'?'Your neighborhood and nearby local conversation':'Everyone inside the 40-mile Neighborly KC network'}</p></div>
              <div className="nkc-scope-switch flex rounded-full p-0.5 gap-0.5" style={{backgroundColor:theme.input,border:`1px solid ${theme.border}`}}>
                <button onClick={()=>setScope('local')} className="px-3 py-1.5 rounded-full text-xs font-black transition-colors" style={{backgroundColor:scope==='local'?theme.pillActive:'transparent',color:scope==='local'?theme.pillTextActive:theme.text}}>📍 My Area</button>
                <button onClick={()=>setScope('kc')} className="px-3 py-1.5 rounded-full text-xs font-black transition-colors" style={{backgroundColor:scope==='kc'?theme.pillActive:'transparent',color:scope==='kc'?theme.pillTextActive:theme.text}}>🏙️ All KC</button>
              </div>
            </div>
            <div className="mb-2 rounded-xl px-3 py-2 text-xs font-bold border" style={{backgroundColor:theme.input,color:theme.text,borderColor:theme.border}}>📍 Posting to: <span style={{color:theme.accent}}>{scope==='kc'?'All Kansas City':cur?.name || 'your neighborhood'}</span></div>
            <textarea ref={postComposerRef} value={body} onChange={e=>setBody(e.target.value)} onFocus={()=>window.setTimeout(()=>postComposerRef.current?.scrollIntoView({behavior:'smooth',block:'center'}),120)} autoComplete="off" autoCorrect="on" autoCapitalize="sentences" spellCheck={true} inputMode="text" name="neighborly-post" data-lpignore="true" placeholder={profile?(scope==='kc'?'What should Kansas City know?':`What's up in ${cur?.name}?`):'Join Neighborly KC to post...'} className="nkc-post-composer w-full rounded-xl p-3 min-h-[80px] text-sm outline-none" data-theme={theme.id} style={{backgroundColor: theme.input, color: theme.text, border: `1px solid ${theme.border}`, scrollMarginBottom:'180px', caretColor: theme.accent, boxShadow: theme.id==='pip-boy' ? `inset 0 0 14px ${theme.accent}22, 0 0 8px ${theme.accent}22` : theme.id==='space' ? `inset 0 0 14px ${theme.accent}16` : undefined }} />
            <div className="flex items-center gap-2 mt-3 min-w-0">
              <label htmlFor="file-input" className="shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-xs font-bold transition-colors hover:opacity-80" style={{borderColor:theme.border}}>Choose image</label>
              <input key={fileInputKey} ref={fileInputRef} id="file-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setFile(e.target.files?.[0]||null)} className="sr-only" />
              {file && <div className="min-w-0 flex items-center gap-2 text-xs opacity-70"><span className="truncate max-w-[180px]" title={file.name}>{file.name}</span><button type="button" onClick={()=>{setFile(null); if(fileInputRef.current) fileInputRef.current.value=''; setFileInputKey(k=>k+1);}} className="shrink-0 font-black" aria-label="Remove selected image">✕</button></div>}
            </div>
            <div className="flex justify-end mt-2">
              <button disabled={uploading} onClick={handleBePost} className="px-5 py-2 rounded-full text-sm font-bold disabled:opacity-50 transition-opacity" style={{backgroundColor: theme.accent, color: theme.pillTextActive}}>{uploading?'Uploading...':scope==='kc'?'Post to KC':'Post to neighbors'}</button>
            </div>
          </div>

          {filtered.map((p:any)=>{
            const cList=comments[p.id]||[]; const isOpen=openComments[p.id]; const pLikes=likes[p.id]||[]; const liked=pLikes.some((l:any)=>l.author_id===profile?.user_id || l.author_name===profile?.full_name);
            const isOwner=Boolean(profile && ((p.user_id && p.user_id===profile.user_id) || (!p.user_id && p.author_name===profile.full_name))); const canManage=isOwner||isAdmin; const isEditing=editingPostId===p.id;
            const isCommenting = commenting[p.id] || false;
            return (
            <div key={p.id} className="rounded-2xl p-4 border nkc-surface nkc-fade-in nkc-post-card" style={{backgroundColor:theme.card,borderColor:theme.border}}>
              <div className="flex justify-between gap-3"><div className="flex items-center gap-2 min-w-0"><div className="w-9 h-9 shrink-0 rounded-full overflow-hidden grid place-items-center font-black text-xs border" style={{backgroundColor:theme.input,borderColor:theme.border}}>{p.profiles?.avatar_url?<img src={p.profiles.avatar_url} alt="" className="w-full h-full object-cover"/>:(p.profiles?.full_name||p.author_name||'N').slice(0,1).toUpperCase()}</div><div><div className="flex items-center gap-1.5 flex-wrap"><p className="text-xs font-bold opacity-60">{(p.user_id||p.author_id)?<a href={`/dms?user=${p.user_id||p.author_id}`} className="hover:underline">{p.profiles?.full_name||p.author_name||'Neighbor'}</a>:(p.profiles?.full_name||p.author_name||'Neighbor')} · {p.category}</p>
                  <div className="nkc-badges">
                    {p.profiles?.is_founder&&<span className="nkc-badge founder">⭐ Founder</span>}
                    {p.profiles?.is_admin&&<span className="nkc-badge moderator">🛡️ Moderator</span>}
                    {topContributorIds.has(p.user_id||p.author_id)&&<span className="nkc-badge contributor">🔥 Top Contributor</span>}
                    {p.profiles?.is_verified&&<span className="nkc-badge verified">✓ Verified</span>}
                  </div></div>{scope==='kc'&&<p className="text-[11px] font-bold mt-1 opacity-45">📍 {neighborhoodName(p.neighborhood_id)}</p>}</div></div>
                {canManage&&<details className="nkc-admin-menu relative shrink-0">
                  <summary className="nkc-admin-menu-trigger" aria-label="Post moderation menu">•••</summary>
                  <div className="nkc-admin-menu-panel" style={{backgroundColor:theme.card,borderColor:theme.border,color:theme.text}}>
                    <button type="button" onClick={()=>beginEdit(p)}>✏️ Edit post</button>
                    <button type="button" onClick={()=>deletePost(p.id,p.image_url,p)}>🗑️ Remove post</button>
                    {isAdmin&&<>
                      <button type="button" onClick={()=>viewPostReports(p)}>🚩 View reports</button>
                      <button type="button" onClick={()=>togglePostModeration(p,'comments_locked',p.comments_locked?'Unlock comments':'Lock comments')}>{p.comments_locked?'🔓 Unlock comments':'🔒 Lock comments'}</button>
                      <button type="button" onClick={()=>togglePostModeration(p,'is_pinned',p.is_pinned?'Unpin post':'Pin post')}>{p.is_pinned?'📌 Unpin post':'📌 Pin post'}</button>
                      {!isOwner&&<>
                        <button type="button" onClick={()=>moderateMember('warn',p)}>⚠️ Warn member</button>
                        <button type="button" onClick={()=>moderateMember('mute',p)}>🔇 Mute member</button>
                        <button type="button" className="danger" onClick={()=>moderateMember('ban',p)}>⛔ Ban member</button>
                        <a href={`/profile/${p.user_id||p.author_id}`}>📋 View activity</a>
                      </>}
                    </>}
                  </div>
                </details>}
              </div>
              {isEditing?<div className="mt-3 rounded-2xl p-3 nkc-pop-in" style={{backgroundColor:theme.input}}><textarea value={editBody} onChange={e=>setEditBody(e.target.value)} className="w-full rounded-xl p-3 min-h-[120px] text-sm outline-none border" style={{backgroundColor:theme.card,color:theme.text,borderColor:theme.border}}/><div className="grid sm:grid-cols-2 gap-2 mt-2"><select value={editCategory} onChange={e=>setEditCategory(e.target.value)} className="rounded-xl px-3 py-2 text-sm border outline-none" style={{backgroundColor:theme.card,color:theme.text,borderColor:theme.border}}>{CATS.filter(c=>c!=='All').map(c=><option key={c}>{c}</option>)}</select><label className="rounded-xl px-3 py-2 text-sm border cursor-pointer" style={{backgroundColor:theme.card,borderColor:theme.border}}><span className="font-bold">📷 Replace image</span><input ref={editFileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>setEditFile(e.target.files?.[0]||null)} className="sr-only"/>{editFile&&<span className="block text-xs opacity-60 truncate mt-1">{editFile.name}</span>}</label></div><div className="flex justify-end gap-2 mt-3"><button onClick={cancelEdit} className="px-4 py-2 rounded-full text-xs font-bold transition-colors" style={{backgroundColor:theme.card,border:`1px solid ${theme.border}`}}>Cancel</button><button disabled={editSaving||!editBody.trim()} onClick={()=>savePostEdit(p)} className="px-4 py-2 rounded-full text-xs font-bold disabled:opacity-50 transition-opacity" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>{editSaving?'Saving...':'Save changes'}</button></div></div>:<>
                <div className="flex items-center gap-2 mt-1">{p.is_pinned&&<span className="nkc-moderation-label">📌 Pinned</span>}{p.comments_locked&&<span className="nkc-moderation-label">🔒 Comments locked</span>}{p.moderator_edited_at&&<span className="nkc-moderation-label">Edited by moderator</span>}</div>
                <p className="mt-1 whitespace-pre-wrap break-words">{p.body||p.content}</p>{p.image_url&&<div className="mt-3 nkc-post-image-frame rounded-xl overflow-hidden border" style={{borderColor:theme.border}}><img src={p.image_url} alt="post" className="nkc-post-image w-full h-full object-cover" loading="lazy" /></div>}<p className="text-xs opacity-40 mt-2">{new Date(p.created_at).toLocaleString()}</p><div className="mt-3 pt-3 border-t flex gap-3 min-w-0" style={{borderColor:theme.border}}><button onClick={()=>togglePostLike(p.id)} className="shrink-0 text-xs font-bold transition-colors hover:opacity-70">{liked?'❤️':'🤍'} {pLikes.length}</button><button onClick={()=>setOpenComments(prev=>({...prev,[p.id]:!prev[p.id]}))} className="shrink-0 text-xs font-bold opacity-60 transition-opacity hover:opacity-100">💬 {cList.length} {isOpen?'▲':'▼'}</button>{!isOwner&&<button onClick={()=>profile?setReportingPost(p):setShowJoin(true)} className="ml-auto shrink-0 text-xs font-bold opacity-55 hover:opacity-100">🚩 Report</button>}</div>{isOpen&&<div className="mt-3 rounded-xl p-2 sm:p-3 space-y-2 min-w-0 overflow-hidden" style={{backgroundColor:theme.input}}>{cList.map((c:any)=>{const cl=cLikes[c.id]||[];const cliked=cl.some((l:any)=>l.author_id===profile?.user_id||l.author_name===profile?.full_name);const canDelC=(profile&&c.author_name===profile.full_name)||isAdmin;return <div key={c.id} className="text-sm rounded-lg p-2 flex justify-between gap-2 min-w-0" style={{backgroundColor:theme.card}}><div className="min-w-0 break-words"><b className="text-xs">{c.author_name}:</b> <span className="break-words">{c.content||c.body}</span><button onClick={()=>toggleCommentLike(c.id)} className="ml-3 text-xs transition-colors hover:opacity-70">{cliked?'❤️':'🤍'} {cl.length}</button></div>{canDelC&&<button onClick={()=>deleteComment(c.id,p.id)} className="shrink-0 text-[10px] opacity-30 hover:opacity-100 transition-opacity">🗑️</button>}</div>})}{p.comments_locked?<p className="text-xs font-bold opacity-60 text-center py-2">🔒 Comments are locked by a moderator.</p>:<div className="flex gap-2 pt-2 min-w-0"><input value={commentText[p.id]||''} onChange={e=>setCommentText(prev=>({...prev,[p.id]:e.target.value}))} placeholder="Add a comment..." className="min-w-0 flex-1 border rounded-full px-3 py-2 text-sm outline-none transition-colors" style={{backgroundColor:theme.card,borderColor:theme.border,color:theme.text}} onKeyDown={(e)=>{if(e.key==='Enter' && !e.shiftKey){e.preventDefault();addComment(p.id);}}}/><button onClick={()=>addComment(p.id)} disabled={isCommenting || !commentText[p.id]?.trim()} className="shrink-0 px-3 sm:px-4 py-2 rounded-full text-xs font-bold disabled:opacity-50 transition-opacity" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>{isCommenting?'...':'Reply'}</button></div>}</div>}
              </>}
            </div>
            );
          })}
        </main>

        <aside className="rounded-2xl p-5 border h-fit nkc-surface" style={{backgroundColor: theme.card, borderColor: theme.border}}>
          <h3 className="font-black">{cur?.name}</h3>
          <p className="text-xs opacity-60">{cur?.zip} · Kansas City, MO</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            <div className="rounded-xl p-3 text-center" style={{backgroundColor: theme.input}}>
              <b className="text-lg">{neighborCount ?? cur?.member_count ?? 0}</b>
              <p className="text-xs">NEIGHBORS</p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{backgroundColor: theme.input}}>
              <b className="text-lg">{scopedPosts.length}</b>
              <p className="text-xs">{scope==='kc'?'KC POSTS':'LOCAL POSTS'}</p>
            </div>
          </div>
        </aside>
      </div>

      <footer className="max-w-6xl mx-auto px-6 pb-24 pt-2 text-center text-xs opacity-50">
        <span>© 2026 Neighborly KC</span>
        <span className="mx-2">·</span>
        <a href="/privacy" className="underline underline-offset-2">Privacy Policy</a>
        <span className="mx-2">·</span>
        <a href="/terms" className="underline underline-offset-2">Terms of Service</a>
      </footer>

      <nav
        className="nkc-mobile-actions nkc-mobile-bottom-nav"
        aria-label="Mobile navigation"
        style={{backgroundColor:theme.header,color:bottomInactiveColor,borderColor:theme.border}}
      >
        <button
          type="button"
          aria-label="Feed"
          className={`nkc-bottom-nav-item ${cat==='All'?'is-active':''}`}
          onClick={()=>{setCat('All');setShowExplore(false);window.scrollTo({top:0,behavior:'smooth'});}}
          style={cat==='All'?{backgroundColor:theme.pillActive,color:theme.pillTextActive}:{color:bottomInactiveColor}}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
          <span>Feed</span>
        </button>

        <button
          type="button"
          aria-label="Safety"
          className={`nkc-bottom-nav-item ${cat==='Safety Alert'?'is-active':''}`}
          onClick={()=>{setCat('Safety Alert');setShowExplore(false);window.scrollTo({top:0,behavior:'smooth'});}}
          style={cat==='Safety Alert'?{backgroundColor:theme.pillActive,color:theme.pillTextActive}:{color:bottomInactiveColor}}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5c0 5.2-3.4 8.5-8 10-4.6-1.5-8-4.8-8-10V6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
          <span>Safety</span>
        </button>

        <button
          type="button"
          aria-label="Create post"
          title="Create post"
          className="nkc-bottom-nav-plus"
          onClick={()=>{ if(!profile){ setShowJoin(true); return; } postComposerRef.current?.focus(); postComposerRef.current?.scrollIntoView({behavior:'smooth',block:'center'}); }}
          style={{backgroundColor:theme.accent,color:theme.pillTextActive,borderColor:theme.header,boxShadow:`0 8px 20px ${theme.accent}55`}}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg>
        </button>

        <button
          type="button"
          aria-label="For Sale"
          className={`nkc-bottom-nav-item ${cat==='For Sale & Free'?'is-active':''}`}
          onClick={()=>{setCat('For Sale & Free');setShowExplore(false);window.scrollTo({top:0,behavior:'smooth'});}}
          style={cat==='For Sale & Free'?{backgroundColor:theme.pillActive,color:theme.pillTextActive}:{color:bottomInactiveColor}}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5 12 4l8 4.5v8L12 21l-8-4.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 11h6M9 14h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>
          <span>For Sale</span>
        </button>

        <button
          type="button"
          aria-label="Explore"
          className={`nkc-bottom-nav-item ${showExplore?'is-active':''}`}
          onClick={()=>{setShowJoin(false);setReportingPost(null);setShowExplore(true);setShowSettings(true);}}
          style={showSettings?{backgroundColor:theme.pillActive,color:theme.pillTextActive}:{color:bottomInactiveColor}}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8"/><path d="m15.8 8.2-2 5.6-5.6 2 2-5.6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>
          <span>Explore</span>
        </button>
      </nav>

      {showSettings && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1050] flex items-center justify-center p-2 sm:p-4 nkc-pop-in">
          <div className="rounded-[24px] w-full max-w-sm p-3 sm:p-5 border max-h-[90vh] overflow-y-auto nkc-settings-modal" style={{backgroundColor: '#15181f', borderColor: '#262a33'}}>
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="font-black text-white text-lg sm:text-xl">{showExplore?'Explore':'Settings'}</h2>
              <button 
                onClick={()=>{setShowSettings(false);setShowExplore(false)}} 
                className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center text-sm hover:bg-white/20 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <button 
              type="button" 
              onClick={()=>setShowThemePicker(v=>!v)} 
              className="w-full flex items-center justify-between py-3 px-4 rounded-2xl border border-white/15 bg-white/10 text-white font-bold text-sm sm:text-base"
            >
              <span>🎨 Themes</span>
              <span className="text-white/60">{showThemePicker?'▲':'▼'}</span>
            </button>
            
            {showThemePicker && <div className="mt-3">
              <p className="text-[8px] sm:text-[10px] font-black tracking-widest uppercase text-white/40 mb-2 text-center sm:text-left">
                Choose your Neighborly KC look · tap a theme to apply & close
              </p>
              <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
                {['aim','sporting','royals','chiefs','pip-boy','space','kc-current','kcpd','kcfd','army','navy','marines','air-force'].map(id=>{ 
                  const t=THEMES[id]; 
                  const active=themeId===id; 
                  return <button 
                    key={id} 
                    type="button" 
                    aria-label={`Use ${t.name} theme`} 
                    onClick={()=>setTheme(id)} 
                    className={`nkc-theme-choice relative aspect-square w-full overflow-hidden rounded-lg sm:rounded-xl border-2 transition-all hover:scale-105 active:scale-95 ${active?'is-active':''}`} 
                    style={{
                      borderColor: active ? t.accent : 'rgba(255,255,255,0.15)',
                      boxShadow: active ? `0 0 0 2px ${t.accent}55` : 'none'
                    }}
                  >
                    {t.themeButtonImage ? 
                      <img 
                        src={t.themeButtonImage} 
                        alt={t.name} 
                        className="w-full h-full object-cover" 
                        loading="lazy"
                      /> :
                      <div className="nkc-theme-choice-fallback w-full h-full flex items-center justify-center p-1 text-center" style={{background:`linear-gradient(135deg,${t.header},${t.accent})`}}>
                        <span className="text-white text-[8px] sm:text-[10px] font-bold leading-tight">{t.name}</span>
                      </div>
                    }
                    {active && <span className="absolute top-0.5 right-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[8px] sm:text-xs font-bold shadow-lg" style={{backgroundColor:t.accent,color:t.pillTextActive}}>✓</span>}
                  </button>
                })}
              </div>
            </div>}
            
            {profile&&<a href="/profile" onClick={()=>setShowSettings(false)} className="mt-3 sm:mt-4 block w-full py-3 rounded-full border border-white/15 bg-white/10 text-white font-bold text-center text-sm sm:text-base">👤 My Profile</a>}
            
            <button onClick={()=>{if(!profile){setShowJoin(true);return;}setShowFeedback(true)}} className="mt-2 w-full py-3 rounded-full border border-white/15 bg-white/10 text-white font-bold text-sm sm:text-base">💬 Leave Feedback</button>
            
            {profile&&<button onClick={signOut} className="mt-2 w-full py-3 rounded-full border border-red-300/20 bg-red-500/10 text-red-200 font-bold text-sm sm:text-base">🚪 Sign out</button>}
            
            <button onClick={()=>{setShowSettings(false);setShowExplore(false)}} className="mt-2 w-full py-3 rounded-full bg-white text-black font-bold text-sm sm:text-base">Done</button>
          </div>
        </div>
      )}

      {showFeedback && <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[70] flex items-center justify-center p-4 nkc-pop-in">
        <div className="rounded-[24px] w-full max-w-sm p-5 border" style={{backgroundColor:theme.card,borderColor:theme.border}}>
          <div className="flex justify-between items-center"><div><h2 className="font-black text-xl">Leave Feedback</h2><p className="text-xs opacity-60 mt-1">Tell Jason what you think about Neighborly KC.</p></div><button onClick={()=>setShowFeedback(false)} className="w-8 h-8 rounded-full flex items-center justify-center" style={{backgroundColor:theme.input}}>✕</button></div>
          <textarea autoFocus maxLength={2000} value={feedbackText} onChange={e=>setFeedbackText(e.target.value)} placeholder="What should we improve?" className="mt-4 w-full min-h-[150px] rounded-2xl p-3 text-sm outline-none border" style={{backgroundColor:theme.input,color:theme.text,borderColor:theme.border}} />
          <div className="flex items-center justify-between mt-2 text-[10px] opacity-50"><span>Your account email will be included so we can reply.</span><span>{feedbackText.length}/2000</span></div>
          <div className="flex gap-2 mt-4"><button onClick={()=>setShowFeedback(false)} className="flex-1 py-3 rounded-full font-bold" style={{backgroundColor:theme.input}}>Cancel</button><button disabled={!feedbackText.trim()||feedbackSending} onClick={submitFeedback} className="flex-1 py-3 rounded-full font-bold disabled:opacity-50" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>{feedbackSending?'Sending…':'Send Feedback'}</button></div>
        </div>
      </div>}

      {reportingPost && <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[90] flex items-center justify-center p-4 nkc-pop-in">
        <div className="rounded-[24px] w-full max-w-sm p-5 border" style={{backgroundColor:theme.card,borderColor:theme.border}}>
          <div className="flex justify-between gap-3"><div><h2 className="font-black text-xl">Report post</h2><p className="text-xs opacity-60 mt-1">A moderator will review your report.</p></div><button onClick={()=>setReportingPost(null)} className="w-8 h-8 rounded-full" style={{backgroundColor:theme.input}}>✕</button></div>
          <label className="block mt-4 text-xs font-black">Reason</label>
          <select value={reportReason} onChange={e=>setReportReason(e.target.value)} className="mt-2 w-full rounded-xl p-3 border" style={{backgroundColor:theme.input,color:theme.text,borderColor:theme.border}}><option>Harassment or bullying</option><option>Hate or abusive language</option><option>Threats or violence</option><option>Sexual or inappropriate content</option><option>Spam or scam</option><option>Private information</option><option>Other</option></select>
          <textarea value={reportDetails} maxLength={500} onChange={e=>setReportDetails(e.target.value)} placeholder="Add details (optional)" className="mt-3 w-full min-h-[100px] rounded-xl p-3 border" style={{backgroundColor:theme.input,color:theme.text,borderColor:theme.border}}/>
          <div className="flex gap-2 mt-4"><button onClick={()=>setReportingPost(null)} className="flex-1 py-3 rounded-full font-bold" style={{backgroundColor:theme.input}}>Cancel</button><button disabled={reportSending} onClick={submitPostReport} className="flex-1 py-3 rounded-full font-bold disabled:opacity-50" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>{reportSending?'Sending…':'Send report'}</button></div>
        </div>
      </div>}

      {feedbackSent && <div className="fixed left-1/2 -translate-x-1/2 bottom-24 z-[80] rounded-full px-5 py-3 shadow-xl font-bold text-sm nkc-pop-in" style={{backgroundColor:theme.card,color:theme.text,border:`1px solid ${theme.border}`}}>✓ Feedback sent — thank you!</div>}

      {(postSuccess || toast) && <div role="status" aria-live="polite" className="fixed left-1/2 -translate-x-1/2 bottom-[86px] sm:bottom-6 z-[120] rounded-2xl px-5 py-3 shadow-xl font-bold text-sm nkc-pop-in max-w-[calc(100vw-32px)] text-center" style={{backgroundColor:theme.card,color:theme.text,border:`1px solid ${theme.border}`}}>{postSuccess?'✓ Post published':toast}</div>}

      {showJoin && (
        <div className="nkc-auth-overlay fixed inset-0 bg-black/70 backdrop-blur-md z-[900] flex items-center justify-center p-4 nkc-pop-in">
          <div className="nkc-auth-card rounded-[28px] w-full max-w-sm p-6 shadow-2xl border" style={{backgroundColor: theme.card, borderColor: theme.border, '--nkc-auth-muted':theme.subtext} as any}>
            <h2 className="font-black text-xl">Join {cur?.name}</h2><p className="text-xs opacity-60">{theme.id==='royals'? 'THE K • 64155 • ROYALS BLUE & WHITE' : theme.id==='chiefs'? 'ARROWHEAD • CHIEFS KINGDOM' : '40 mile radius KC network'}</p>
            <div className="nkc-auth-google mt-5 min-h-[44px] flex items-center justify-center">
              {googleLoading
                ? <div className="w-full bg-white border-2 border-black text-black py-3.5 rounded-full font-bold text-sm text-center">Signing in…</div>
                : <div ref={googleButtonRef} className="flex justify-center w-full" aria-label="Continue with Google" />}
            </div>
            <div className="nkc-auth-divider-row flex items-center gap-3 my-5"><div className="h-px flex-1" style={{backgroundColor:theme.border}}></div><span className="nkc-auth-divider text-xs font-bold">OR EMAIL CODE</span><div className="h-px flex-1" style={{backgroundColor:theme.border}}></div></div>
            <div className="space-y-3">
              <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name (optional)" className="nkc-themed-field w-full border rounded-xl px-4 py-3 text-sm outline-none" style={{backgroundColor:theme.input,color:theme.text,borderColor:theme.border}}/>
              <input value={email} onChange={e=>setEmail(e.target.value)} inputMode="email" autoComplete="email" placeholder="Email address" className="nkc-themed-field w-full border rounded-xl px-4 py-3 text-sm outline-none" style={{backgroundColor:theme.input,color:theme.text,borderColor:theme.border}}/>
              {!emailCodeSent && <input value={addr} onChange={e=>setAddr(e.target.value)} placeholder={`Address in ${cur?.zip} (optional)`} className="nkc-themed-field w-full border rounded-xl px-4 py-3 text-sm outline-none" style={{backgroundColor:theme.input,color:theme.text,borderColor:theme.border}}/>}
              {emailCodeSent && <input value={emailCode} onChange={e=>setEmailCode(e.target.value.replace(/\D/g,'').slice(0,6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="Enter the 6-digit code" className="nkc-themed-field w-full border rounded-xl px-4 py-3 text-center tracking-[0.45em] font-black text-lg outline-none" style={{backgroundColor:theme.input,color:theme.text,borderColor:theme.border}}/>}
              {emailCodeSent && <div className="rounded-xl p-3 text-xs leading-5" style={{backgroundColor:theme.input,color:theme.text}}><b>Check your email</b><br/>Use the 6-digit code in the message. If a Sign In link is provided, tapping the link will also finish login.</div>}
              {emailAuthMessage && <p className="text-xs font-semibold text-center opacity-70">{emailAuthMessage}</p>}
              <div className="nkc-auth-buttons flex gap-2 pt-2"><button type="button" onClick={()=>{setShowJoin(false);setEmailCodeSent(false);setEmailCode('');setEmailAuthMessage('')}} className="flex-1 py-3 rounded-full font-bold text-sm" style={{backgroundColor:'#f8f5ee',color:'#1f2937'}}>Cancel</button>{emailCodeSent ? <button type="button" disabled={emailAuthLoading} onClick={verifyEmailLoginCode} className="nkc-auth-action flex-1 py-3 rounded-full font-bold text-sm" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>{emailAuthLoading?'Checking…':'Verify & Sign In'}</button> : <button type="button" disabled={emailAuthLoading||!email.trim()} onClick={sendEmailLoginCode} className="nkc-auth-action flex-1 py-3 rounded-full font-bold text-sm" style={{backgroundColor:theme.accent,color:theme.pillTextActive}}>{emailAuthLoading?'Sending…':'Send Code'}</button>}</div>
              {emailCodeSent && <button type="button" disabled={emailAuthLoading} onClick={sendEmailLoginCode} className="w-full text-xs font-bold underline opacity-60">Send a new code</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
