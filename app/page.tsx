18:16:57.395 Running build in Washington, D.C., USA (East) – iad1
18:16:57.396 Build machine configuration: 2 cores, 8 GB
18:16:57.526 Cloning github.com/incredibean-hash/neighborly-kc (Branch: main, Commit: dbbf572)
18:16:57.885 Cloning completed: 358.000ms
18:16:58.786 Restored build cache from previous deployment (5utnbfehX72zkHJutWj2v8ygoWVF)
18:16:59.071 Running "vercel build"
18:16:59.096 Vercel CLI 58.1.0
18:16:59.269 Error: Node.js version 20.x is deprecated. Deployments created on or after 2026-10-01 will fail to build. Please set Node.js Version to 24.x in your Project Settings to use Node.js 24.
18:16:59.343 Installing dependencies...
18:17:01.366 npm warn EBADENGINE Unsupported engine {
18:17:01.366 npm warn EBADENGINE   package: '@supabase/auth-js@2.112.2',
18:17:01.367 npm warn EBADENGINE   required: { node: '>=22.0.0' },
18:17:01.367 npm warn EBADENGINE   current: { node: 'v20.20.2', npm: '10.8.2' }
18:17:01.367 npm warn EBADENGINE }
18:17:01.367 npm warn EBADENGINE Unsupported engine {
18:17:01.367 npm warn EBADENGINE   package: '@supabase/functions-js@2.112.2',
18:17:01.367 npm warn EBADENGINE   required: { node: '>=22.0.0' },
18:17:01.367 npm warn EBADENGINE   current: { node: 'v20.20.2', npm: '10.8.2' }
18:17:01.367 npm warn EBADENGINE }
18:17:01.368 npm warn EBADENGINE Unsupported engine {
18:17:01.368 npm warn EBADENGINE   package: '@supabase/postgrest-js@2.112.2',
18:17:01.368 npm warn EBADENGINE   required: { node: '>=22.0.0' },
18:17:01.368 npm warn EBADENGINE   current: { node: 'v20.20.2', npm: '10.8.2' }
18:17:01.368 npm warn EBADENGINE }
18:17:01.368 npm warn EBADENGINE Unsupported engine {
18:17:01.368 npm warn EBADENGINE   package: '@supabase/realtime-js@2.112.2',
18:17:01.368 npm warn EBADENGINE   required: { node: '>=22.0.0' },
18:17:01.368 npm warn EBADENGINE   current: { node: 'v20.20.2', npm: '10.8.2' }
18:17:01.368 npm warn EBADENGINE }
18:17:01.368 npm warn EBADENGINE Unsupported engine {
18:17:01.368 npm warn EBADENGINE   package: '@supabase/storage-js@2.112.2',
18:17:01.369 npm warn EBADENGINE   required: { node: '>=22.0.0' },
18:17:01.369 npm warn EBADENGINE   current: { node: 'v20.20.2', npm: '10.8.2' }
18:17:01.369 npm warn EBADENGINE }
18:17:01.369 npm warn EBADENGINE Unsupported engine {
18:17:01.369 npm warn EBADENGINE   package: '@supabase/supabase-js@2.112.2',
18:17:01.370 npm warn EBADENGINE   required: { node: '>=22.0.0' },
18:17:01.370 npm warn EBADENGINE   current: { node: 'v20.20.2', npm: '10.8.2' }
18:17:01.370 npm warn EBADENGINE }
18:17:01.444 
18:17:01.445 up to date in 2s
18:17:01.445 
18:17:01.445 26 packages are looking for funding
18:17:01.445   run `npm fund` for details
18:17:01.452 Detected Next.js version: 14.2.0
18:17:01.456 Running "npm run build"
18:17:01.586 
18:17:01.586 > build
18:17:01.586 > next build
18:17:01.586 
18:17:02.328   ▲ Next.js 14.2.0
18:17:02.329 
18:17:02.357    Creating an optimized production build ...
18:17:04.634 Failed to compile.
18:17:04.635 
18:17:04.635 ./app/page.tsx
18:17:04.635 Error: 
18:17:04.635   x Unexpected token `div`. Expected jsx identifier
18:17:04.635     ,-[/vercel/path0/app/page.tsx:86:1]
18:17:04.635  86 |   );
18:17:04.635  87 | 
18:17:04.635  88 |   return (
18:17:04.635  89 |     <div className="min-h-screen bg-[#f8f5ee] p-4 md:p-8">
18:17:04.635     :      ^^^
18:17:04.636  90 |       <div className="max-w- mx-auto">
18:17:04.636  91 |         <div className="flex justify-between items-center mb-6">
18:17:04.636  92 |           <h1 className="font-black text-2xl">Neighborly KC <span className="font-normal text-gray-500 text-lg ml-2">Parkwood Hills</span></h1>
18:17:04.636     `----
18:17:04.636 
18:17:04.636 Caused by:
18:17:04.636     Syntax Error
18:17:04.636 
18:17:04.636 Import trace for requested module:
18:17:04.636 ./app/page.tsx
18:17:04.636 
18:17:04.648 
18:17:04.648 > Build failed because of webpack errors
18:17:04.678 Error: Command "npm run build" exited with 1
