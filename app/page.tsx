'use client'
import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

const CATS = ['All','Safety','For Sale','Recommendations','Lost & Found','Events','General']

export default function Home(){
  const [hoods,setHoods]=useState<any[]>([])
  const [hood,setHood]=useState('meadowbrook-heights')
  const [cat,setCat]=useState('All')
  const [posts,setPosts]=useState<any[]>([])
  const [profile,setProfile]=useState<any>(null)
  const [text,setText]=useState('')

  useEffect(()=>{
    const load=async()=>{
      const {data:neigh}=await supabase.from('neighborhoods').select('*').order('member_count',{ascending:false})
      if(neigh) setHoods(neigh)
      const {data:p}=await supabase.from('posts').select('*').order('created_at',{ascending:false}).limit(50)
      if(p) setPosts(p)
    }
    load()
  },[])

  const cur = hoods.find((x:any)=>x.slug===hood) || hoods.find((x:any)=>x.slug==='meadowbrook-heights') || hoods[0] || {name:'Meadowbrook Heights', zip:'64155', member_count:247, slug:'meadowbrook-heights'}

  return (
    <div className="min-h-screen bg-[#f0f2f1] p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center justify-center font-black"><div>Neighborly KC</div><span className="ml-3 text-xs bg-green-100 border px-2 py-1 rounded-full">LIVE {cur?.name} {cur?.zip}</span></div>
          <select value={hood} onChange={e=>setHood(e.target.value)} className="border rounded-full px-4 py-2 text-sm font-bold">
            {hoods.map((h:any)=><option key={h.slug} value={h.slug}>{h.name} {h.zip}</option>)}
          </select>
        </div>

        <div className
