import type { Metadata } from 'next';
import './globals.css';
import './botb.css';
export const metadata:Metadata={title:'Predict — Your matchday. Your call.',description:'Six matches. Your predictions. All to play for. Welcome to Predict.',icons:{icon:'/favicon.svg'}};
export default function Layout({children}:{children:React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
