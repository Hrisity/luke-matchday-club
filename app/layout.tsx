import type { Metadata } from 'next';
import './globals.css';
import './botb.css';
import './simply.css';
export const metadata:Metadata={title:'simply predict',description:'Sports prediction games, leagues, leaderboards, and partner-managed competitions.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
