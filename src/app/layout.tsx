// app/layout.tsx
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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
  title: "HSMT 9000",
  description: "Hyper-Secure Money Tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Forcing dark mode globally so our premium aesthetic works
    <html lang="en" className="dark">
      <body
        className={`${fontMain.variable} ${fontSans.variable} ${fontMono.variable} font-sans antialiased min-h-screen bg-slate-950 bg-gradient-to-br from-slate-900 via-black to-slate-950 text-slate-100`}
      >
        {children}
      </body>
    </html>
  );
}
