import type { Metadata } from 'next'
import '@/styles/index.css'
import { ToastProvider } from '@/hooks/useToast'
import ErrorBoundary from '@/components/ui/ErrorBoundary'

export const metadata: Metadata = {
  title: 'Learning Log - Architecture View',
  description: 'Deep Learning Log System',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body><ToastProvider><ErrorBoundary>{children}</ErrorBoundary></ToastProvider></body>
    </html>
  )
}
