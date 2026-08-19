'use client';

import Link from 'next/link';

export default function MobileBottomNav({theme,active=''}:{theme:any;active?:string}){
  const inactive=theme.id==='aim'?'#111111':theme.id==='pip-boy'?theme.text:'#ffffff';
  const item=(key:string)=>active===key?{backgroundColor:theme.pillActive,color:theme.pillTextActive}:{color:inactive};
  return <nav className="nkc-mobile-actions nkc-mobile-bottom-nav" aria-label="Mobile navigation" style={{backgroundColor:theme.header,color:inactive,borderColor:theme.border}}>
    <Link href="/" className={`nkc-bottom-nav-item ${active==='feed'?'is-active':''}`} style={item('feed')}><span aria-hidden="true">⌂</span><span>Feed</span></Link>
    <Link href="/?category=Safety%20Alert#composer" className={`nkc-bottom-nav-item ${active==='safety'?'is-active':''}`} style={item('safety')}><span aria-hidden="true">♢</span><span>Safety</span></Link>
    <Link href="/?compose=1#composer" className="nkc-bottom-nav-plus" aria-label="Create post" style={{backgroundColor:theme.accent,color:theme.pillTextActive,borderColor:theme.header,boxShadow:`0 8px 20px ${theme.accent}55`}}><span aria-hidden="true">＋</span></Link>
    <Link href="/?category=For%20Sale%20%26%20Free#composer" className={`nkc-bottom-nav-item ${active==='sale'?'is-active':''}`} style={item('sale')}><span aria-hidden="true">▱</span><span>For Sale</span></Link>
    <Link href="/?explore=1" className={`nkc-bottom-nav-item ${active==='explore'?'is-active':''}`} style={item('explore')}><span aria-hidden="true">◉</span><span>Explore</span></Link>
  </nav>;
}
