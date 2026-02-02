import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Söhbət Vidjeti Dəmo – Azerbaijanca',
  description: 'Chat vidjetinizin canlı demosu: inteqrasiya, nümayiş və sınaq üçün sadə sayt.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="az">
      <body>{children}</body>
    </html>
  )
}

