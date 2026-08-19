'use client';

import Link from 'next/link';

export default function MobileBottomNav({theme,active=''}:{theme:any;active?:string}){
  const inactive=theme.id==='aim'?'#111111':theme.id==='pip-boy'?theme.text:'#ffffff';
  const item=(key:string)=>active===key?{backgroundColor:theme.pillActive,color:theme.pillTextActive}:{color:inactive};
  return <nav className="nkc-mobile-actions nkc-mobile-bottom-nav" aria-label="Mobile navigation" style={{backgroundColor:theme.header,color:inactive,borderColor:theme.border,'--nkc-bottom-inactive':inactive} as any}>
    <Link href="/" className={`nkc-bottom-nav-item ${active==='feed'?'is-active':''}`} style={item('feed')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg><span>Feed</span></Link>
    <Link href="/?category=Safety%20Alert#composer" className={`nkc-bottom-nav-item ${active==='safety'?'is-active':''}`} style={item('safety')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 6v5c0 5.2-3.4 8.5-8 10-4.6-1.5-8-4.8-8-10V6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="m9 12 2 2 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg><span>Safety</span></Link>
    <Link href="/?compose=1#composer" className="nkc-bottom-nav-plus" aria-label="Create post" style={{backgroundColor:theme.accent,color:theme.pillTextActive,borderColor:theme.border,boxShadow:`0 8px 20px ${theme.accent}55`}}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></svg></Link>
    <Link href="/?category=For%20Sale%20%26%20Free#composer" className={`nkc-bottom-nav-item ${active==='sale'?'is-active':''}`} style={item('sale')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8.5 12 4l8 4.5v8L12 21l-8-4.5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 11h6M9 14h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg><span>For Sale</span></Link>
    <Link href="/?settings=1" className={`nkc-bottom-nav-item ${active==='settings'?'is-active':''}`} style={item('settings')}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.7 3.6h4.6l.6 2.1 1.8 1 2.1-.5 2.3 4-1.5 1.6v2.1l1.5 1.6-2.3 4-2.1-.5-1.8 1-.6 2.1H9.7L9.1 20l-1.8-1-2.1.5-2.3-4 1.5-1.6v-2.1L2.9 10l2.3-4 2.1.5 1.8-1z" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinejoin="round"/><circle cx="12" cy="12.8" r="2.7" fill="none" stroke="currentColor" strokeWidth="1.7"/></svg><span>Settings</span></Link>
  </nav>;
}
