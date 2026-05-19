export const metadata = {
  title: 'Legalize PE API',
  description: 'API para legislación peruana',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
