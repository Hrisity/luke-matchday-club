import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Luke — Your matchday. Your call.',description:'Eight matches. Your predictions. All to play for. Welcome to the Luke prediction club.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
