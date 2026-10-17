import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RogueWeb: Echoes of the Grid',
  description: '2D Roguelike Multiplayer Game',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
