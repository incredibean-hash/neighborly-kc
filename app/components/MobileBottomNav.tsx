'use client';

import Link from 'next/link';

export default function MobileBottomNav({theme,active=''}:{theme:any;active?:string}){
  const inactive=theme.id==='aim'?'#111111':theme.id==='pip-boy'?theme.text:'#ffffff';
  const orb={backgroundColor:theme.accent,color:theme.pillTextActive,borderColor:theme.border,boxShadow:`0 8px 20px ${theme.accent}55`};
  return <nav className="nkc-mobile-actions nkc-mobile-bottom-nav" data-theme={theme.id} aria-label="Mobile navigation" style={{backgroundColor:theme.header,color:inactive,borderColor:theme.border,'--nkc-bottom-inactive':inactive} as any}>
    <Link href="/dms" aria-label="Messages" title="Messages" className={`nkc-bottom-nav-orb-item ${active==='messages'?'is-active':''}`} style={orb}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16v11H9l-5 3v-14Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M8 9h8M8 12.5h5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg><span className="sr-only">Messages</span></Link>
    <Link href="/?compose=1#composer" className="nkc-bottom-nav-plus" aria-label="Create post" style={{backgroundColor:theme.accent,color:theme.pillTextActive,borderColor:theme.border,boxShadow:`0 8px 20px ${theme.accent}55`}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg></Link>
    <Link href="/?settings=1" aria-label="Settings" title="Settings" className={`nkc-bottom-nav-orb-item ${active==='settings'?'is-active':''}`} style={orb}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.7 3.6h4.6l.6 2.1 1.8 1 2.1-.5 2.3 4-1.5 1.6v2.1l1.5 1.6-2.3 4-2.1-.5-1.8 1-.6 2.1H9.7L9.1 20l-1.8-1-2.1.5-2.3-4 1.5-1.6v-2.1L2.9 10l2.3-4 2.1.5 1.8-1z" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round"/><circle cx="12" cy="12.8" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg><span className="sr-only">Settings</span></Link>
  </nav>;
}
