
import './globals.css';
export const metadata={title:'Neighborly KC - Nextdoor Clone', description:'Kansas City neighborhood network - 40 mile radius'};
export default function RootLayout({children}:{children:React.ReactNode}){
  return (<html lang="en"><body>{children}</body></html>);
}
