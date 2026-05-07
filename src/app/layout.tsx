export const metadata = {
  title: 'Supabase Todo App',
  description: 'Built with Next.js + Supabase',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  )
}
