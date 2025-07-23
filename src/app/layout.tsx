
import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/lib/auth';
import { PT_Sans } from 'next/font/google';
import { NextThemeProvider } from '@/components/theme-provider';

const ptSans = PT_Sans({
  subsets: ['latin'],
  weight: ['400', '700'],
});

export const metadata: Metadata = {
  title: 'iSkylar: AI Voice Therapy',
  description: 'Real-Time Generative AI Voice Therapist',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${ptSans.className} antialiased`}>
        <NextThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </NextThemeProvider>
      </body>
    </html>
  );
}
