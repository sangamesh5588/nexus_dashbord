import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../lib/auth-context';
import { AuthGate } from '../components/AuthGate';

export const metadata: Metadata = {
  title: 'Nexus Unified Dashboard',
  description: 'Manage Instagram and LinkedIn content from one focused workspace.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AuthGate>{children}</AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
