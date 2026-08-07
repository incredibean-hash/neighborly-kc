18:53:36.322 Running build in Washington, D.C., USA (East) – iad1
18:53:36.323 Build machine configuration: 2 cores, 8 GB
18:53:36.475 Cloning github.com/incredibean-hash/neighborly-kc (Branch: main, Commit: cc4408b)
18:53:36.826 Cloning completed: 351.000ms
18:53:37.440 Skipping build cache since Node.js version changed from "20.x" to "24.x"
18:53:37.678 Running "vercel build"
18:53:37.704 Vercel CLI 58.1.0
18:53:37.878 Installing dependencies...
18:53:45.750 npm warn deprecated next@14.2.0: This version has a security vulnerability. Please upgrade to a patched version. See https://nextjs.org/blog/security-update-2025-12-11 for more details.
18:53:45.810 
18:53:45.811 added 132 packages in 8s
18:53:45.812 
18:53:45.812 26 packages are looking for funding
18:53:45.812   run `npm fund` for details
18:53:45.853 Detected Next.js version: 14.2.0
18:53:45.857 Running "npm run build"
18:53:45.964 
18:53:45.964 > build
18:53:45.965 > next build
18:53:45.965 
18:53:46.504 Attention: Next.js now collects completely anonymous telemetry regarding usage.
18:53:46.504 This information is used to shape Next.js' roadmap and prioritize features.
18:53:46.505 You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
18:53:46.505 https://nextjs.org/telemetry
18:53:46.505 
18:53:46.554   ▲ Next.js 14.2.0
18:53:46.555 
18:53:46.573    Creating an optimized production build ...
18:53:58.694  ✓ Compiled successfully
18:53:58.696    Linting and checking validity of types ...
18:54:01.221 Failed to compile.
18:54:01.222 
18:54:01.222 ./app/page.tsx:97:36
18:54:01.222 Type error: Property 'from' does not exist on type 'PostgrestQueryBuilder<any, any, any, "posts", unknown>'.
18:54:01.222 
18:54:01.222    95 |     // Also try insert with extra fields (if you added columns, it will work)
18:54:01.222    96 |     try{
18:54:01.222 >  97 |       await supabase.from('posts').from('posts').insert({
18:54:01.222       |                                    ^
18:54:01.222    98 |         user_name: profile.full_name,
18:54:01.222    99 |         content: `[${reach}] ${text}`,
18:54:01.222   100 |         category: cat,
18:54:01.291 Error: Command "npm run build" exited with 1
