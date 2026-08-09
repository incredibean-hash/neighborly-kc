'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function BluetoothPage(){
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading'|'ready'|'scanning'|'verified'|'approved'|'error'>('loading');
  const [approval, setApproval] = useState<any>(null);
  const [error, setError] = useState<string|null>(null);
  const [deviceName, setDeviceName] = useState<string|null>(null);

  useEffect(()=>{
    if(!token){ setStatus('error'); setError('No token provided'); return; }
    (async()=>{
      try{
        const res = await fetch(`/api/bluetooth-status?token=${token}`);
        const j = await res.json();
        if(!j.approval) throw new Error('Invalid token');
        setApproval(j.approval);
        if(j.approval.status !== 'pending') { setStatus('approved'); return; }
        setStatus('ready');
      }catch(e:any){ setStatus('error'); setError(e.message); }
    })();
  },[token]);

  const handleBluetoothScan = async()=>{
    setStatus('scanning');
    setError(null);
    try{
      // @ts-ignore - Web Bluetooth API
      if(!navigator.bluetooth){
        throw new Error('Bluetooth not supported on this device/browser. Use Chrome on Android or desktop.');
      }
      // @ts-ignore
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service']
      });
      setDeviceName(device.name || 'Nearby device');
      setStatus('verified');
    }catch(e:any){
      if(e.name === 'NotFoundError'){
        setError('No device selected. Make sure both phones have Bluetooth ON and are near each other.');
      } else {
        setError(e.message || 'Bluetooth scan failed');
      }
      setStatus('ready');
    }
  };

  const handleApprove = async()=>{
    try{
      const res = await fetch('/api/approve-bluetooth',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ token, bluetoothVerified: true })
      });
      const j = await res.json();
      if(!res.ok) throw new Error(j.error || 'Approval failed');
      setStatus('approved');
    }catch(e:any){ setError(e.message); setStatus('ready'); }
  };

  if(status === 'loading') return <div className="min-h-screen bg-[#f8f5ee] flex items-center justify-center p-6"><p className="font-bold">Loading tap request...</p></div>;
  if(status === 'error') return <div className="min-h-screen bg-[#f8f5ee] flex items-center justify-center p-6"><div className="bg-white rounded-2xl p-6 max-w-sm w-full border text-center"><p className="text-red-600 font-bold">❌ {error}</p><Link href="/" className="mt-4 block bg-black text-white py-2 rounded-full text-sm">Back home</Link></div></div>;

  return (
    <div className="min-h-screen bg-[#f8f5ee] flex items-center justify-center p-4">
      <div className="bg-white rounded-[24px] w-full max-w-[400px] p-6 border shadow-sm">
        <h1 className="font-black text-xl text-center">📲 Bluetooth Tap</h1>
        <p className="text-xs opacity-60 text-center mt-1">Verify proximity (30ft)</p>
        
        {approval && (
          <div className="mt-4 bg-[#f8f5ee] rounded-xl p-3 border">
            <p className="text-[11px] opacity-60">Request from:</p>
            <p className="font-black text-sm">{approval.requester}</p>
            <p className="text-[11px] opacity-60 mt-2">Address:</p>
            <p className="font-bold text-xs">{approval.address}</p>
          </div>
        )}

        {status === 'ready' && (
          <>
            <div className="mt-5 text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto border-2 border-blue-200">
                <span className="text-3xl">📲</span>
              </div>
              <p className="text-sm font-bold mt-3">Step 1: Verify you're together</p>
              <p className="text-[11px] opacity-60 mt-1 px-2">Both phones need Bluetooth ON. Tap scan to prove you're within 30ft.</p>
            </div>
            {error && <p className="mt-3 bg-red-50 border border-red-200 text-red-700 text-[11px] p-2.5 rounded-xl">{error}</p>}
            <button onClick={handleBluetoothScan} className="mt-5 w-full bg-blue-600 text-white py-3 rounded-full font-black text-sm">🔍 Scan for Nearby Device</button>
            <p className="text-[10px] opacity-40 text-center mt-2">Uses Web Bluetooth — Chrome Android/Desktop required</p>
          </>
        )}

        {status === 'scanning' && (
          <div className="mt-6 text-center">
            <div className="animate-pulse w-20 h-20 bg-blue-100 rounded-full mx-auto flex items-center justify-center">📡</div>
            <p className="font-bold mt-3 text-sm">Scanning...</p>
            <p className="text-[11px] opacity-60">Select your neighbor's device in popup</p>
          </div>
        )}

        {status === 'verified' && (
          <>
            <div className="mt-5 bg-green-50 border-2 border-green-300 rounded-xl p-3 text-center">
              <p className="text-green-800 font-black text-sm">✅ Proximity Verified!</p>
              <p className="text-green-700 text-[11px] mt-1">Found: {deviceName} (within 30ft)</p>
            </div>
            <button onClick={handleApprove} className="mt-4 w-full bg-black text-white py-3 rounded-full font-black text-sm">✅ Approve {approval?.requester}</button>
            <button onClick={()=>setStatus('ready')} className="mt-2 w-full bg-[#f8f5ee] py-2.5 rounded-full font-bold text-xs">Rescan</button>
          </>
        )}

        {status === 'approved' && (
          <div className="mt-5 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">✅</div>
            <p className="font-black mt-3">Approved!</p>
            <p className="text-xs opacity-60 mt-1">{approval?.requester} can now join {approval?.address} with 40 mile access.</p>
            <Link href="/" className="mt-5 block w-full bg-black text-white py-3 rounded-full font-black text-sm text-center">Back to Feed</Link>
          </div>
        )}
      </div>
    </div>
  );
}

