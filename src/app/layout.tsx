// app/layout.tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const fontMain = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-main",
});

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Budgify",
  description: "Monthly budget Tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
         * Blocking theme script — executed synchronously before first paint.
         * A raw <script> tag (not next/script) is used here intentionally:
         * the Next.js <Script strategy="beforeInteractive"> component is NOT
         * guaranteed to block rendering in the App Router, whereas a plain
         * <script> in <head> is render-blocking by the HTML specification.
         *
         * This script reads localStorage and applies the correct class and
         * color-scheme style to <html> so the correct theme is visible on
         * the very first frame — no flash, no hydration mismatch.
         */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('budgify-theme');var t=s==='light'||s==='dark'||s==='system'?s:'dark';var r=document.documentElement;r.classList.remove('light','dark');var d;if(t==='system'){d=window.matchMedia('(prefers-color-scheme: dark)').matches;r.classList.add(d?'dark':'light');r.style.colorScheme=d?'dark':'light';}else{r.classList.add(t);r.style.colorScheme=t;}}catch(e){document.documentElement.classList.add('dark');document.documentElement.style.colorScheme='dark';}})();`,
          }}
        />
      </head>
      <body
        className={`${fontMain.variable} ${fontSans.variable} ${fontMono.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
