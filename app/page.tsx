18:57:35.335 Running build in Washington, D.C., USA (East) – iad1
18:57:35.336 Build machine configuration: 2 cores, 8 GB
18:57:35.476 Cloning github.com/incredibean-hash/neighborly-kc (Branch: main, Commit: b467ea6)
18:57:35.876 Cloning completed: 399.000ms
18:57:36.372 Skipping build cache since Node.js version changed from "20.x" to "24.x"
18:57:36.560 Running "vercel build"
18:57:36.598 Vercel CLI 58.1.0
18:57:36.830 Installing dependencies...
18:57:44.977 npm warn deprecated next@14.2.0: This version has a security vulnerability. Please upgrade to a patched version. See https://nextjs.org/blog/security-update-2025-12-11 for more details.
18:57:45.035 
18:57:45.036 added 132 packages in 8s
18:57:45.036 
18:57:45.036 26 packages are looking for funding
18:57:45.037   run `npm fund` for details
18:57:45.076 Detected Next.js version: 14.2.0
18:57:45.079 Running "npm run build"
18:57:45.182 
18:57:45.182 > build
18:57:45.182 > next build
18:57:45.183 
18:57:45.727 Attention: Next.js now collects completely anonymous telemetry regarding usage.
18:57:45.728 This information is used to shape Next.js' roadmap and prioritize features.
18:57:45.728 You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
18:57:45.728 https://nextjs.org/telemetry
18:57:45.728 
18:57:45.787   ▲ Next.js 14.2.0
18:57:45.787 
18:57:45.803    Creating an optimized production build ...
18:57:50.391 Failed to compile.
18:57:50.391 
18:57:50.394 ./app/page.tsx
18:57:50.395 Error: 
18:57:50.395   x Expected ';', '}' or <eof>
18:57:50.395    ,-[/vercel/path0/app/page.tsx:1:1]
18:57:50.395  1 | 18:53:36.322 Running build in Washington, D.C., USA (East) – iad1
18:57:50.395    : ^|^
18:57:50.395    :  `-- This is the expression part of an expression statement
18:57:50.395  2 | 18:53:36.323 Build machine configuration: 2 cores, 8 GB
18:57:50.395  3 | 18:53:36.475 Cloning github.com/incredibean-hash/neighborly-kc (Branch: main, Commit: cc4408b)
18:57:50.395  4 | 18:53:36.826 Cloning completed: 351.000ms
18:57:50.396    `----
18:57:50.396 
18:57:50.396 Caused by:
18:57:50.396     Syntax Error
18:57:50.396 
18:57:50.396 Import trace for requested module:
18:57:50.396 ./app/page.tsx
18:57:50.396 
18:57:50.407 
18:57:50.407 > Build failed because of webpack errors
18:57:50.473 Error: Command "npm run build" exited with 1
