import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'LOD — 동대문 새벽시장 전문 사입 서비스',
  description: '담당삼촌과 1:1 상담·직배송·일일사입·월사입환영 ★담당사입삼촌모집★',
  other: {
    'naver-site-verification': 'a866083de8243802c4d75286bf583fa098428e3c',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
