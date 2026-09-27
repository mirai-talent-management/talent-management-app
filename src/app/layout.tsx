import type { Metadata } from 'next'
import '../styles.css'

export const metadata: Metadata = {
  title: 'みらいタレントマネジメント | v0.2',
  description: 'サポーターのスキル・経験を育て、活動と仲間をつなぐTalent Managementプロトタイプ。',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ja"><body>{children}</body></html>
}
