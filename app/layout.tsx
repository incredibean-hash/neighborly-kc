19:08:53.628 Running build in Washington, D.C., USA (East) – iad1
19:08:53.629 Build machine configuration: 2 cores, 8 GB
19:08:53.765 Cloning github.com/incredibean-hash/neighborly-kc (Branch: main, Commit: 3debb48)
19:08:54.161 Cloning completed: 395.000ms
19:08:54.855 Restored build cache from previous deployment (2LZaNgpMfHmi7X2BzUWPbVUgr4Ar)
19:08:55.082 Running "vercel build"
19:08:55.100 Vercel CLI 58.1.0
19:08:55.424 Installing dependencies...
19:08:58.386 
19:08:58.387 up to date in 2s
19:08:58.388 
19:08:58.388 24 packages are looking for funding
19:08:58.389   run `npm fund` for details
19:08:58.423 Detected Next.js version: 14.2.5
19:08:58.427 Running "npm run build"
19:08:58.906 
19:08:58.907 > build
19:08:58.907 > next build
19:08:58.908 
19:08:59.644   ▲ Next.js 14.2.5
19:08:59.645 
19:08:59.662    Creating an optimized production build ...
19:09:04.906  ✓ Compiled successfully
19:09:04.907    Linting and checking validity of types ...
19:09:05.233 
19:09:05.234    We detected TypeScript in your project and created a tsconfig.json file for you.
19:09:07.951 Failed to compile.
19:09:07.952 
19:09:07.952 ./app/layout.tsx:13:3
19:09:07.952 Type error: Object literal may only specify known properties, and 'backgroundColor' does not exist in type 'Viewport'.
19:09:07.953 
19:09:07.954   11 | export const viewport: Viewport = {
19:09:07.954   12 |   themeColor: "#0a0a0a",
19:09:07.954 > 13 |   backgroundColor: "#0a0a0a",
19:09:07.954      |   ^
19:09:07.954   14 | };
19:09:07.954   15 |
19:09:07.955   16 | export default function RootLayout({ children }: { children: React.ReactNode }) {
19:09:08.028 Error: Command "npm run build" exited with 1
