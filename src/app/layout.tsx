// src/app/layout.tsx
import { Inter } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'
import { LanguageProvider } from '@/contexts/LanguageContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Gong Komodo Tour & Travel',
  description: 'Jelajahi keindahan Pulau Komodo dan sekitarnya bersama kami'
  
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <LanguageProvider>
          {children}
          <Toaster />
        </LanguageProvider>
      </body>
    </html>
  )
}