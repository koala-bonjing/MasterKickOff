import type { Metadata } from 'next';
import { ColorSchemeScript } from '@mantine/core';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'SoundGraph | Six Degrees of Music Collaboration',
  description: 'Explore the shortest collaboration paths, 2-hop recommendations, and super-hubs in modern music using openCypher and graph databases.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-mantine-color-scheme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body className="bg-graph-bg text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
