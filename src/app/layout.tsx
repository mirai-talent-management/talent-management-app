import type { Metadata } from 'next'
import '../styles.css'

export const metadata: Metadata = {
  title: 'みらいコネクト | サポータースキルシート',
  description: 'チームみらいのサポーターのスキルと活動をつなぐスキルシートアプリ。',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>
}
