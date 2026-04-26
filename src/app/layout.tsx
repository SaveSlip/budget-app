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
  title: "Budgify",
  description: "Monthly budget Tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Forcing dark mode globally so our premium aesthetic works
    <html lang="en">
      <body
        className={`${fontMain.variable} ${fontSans.variable} ${fontMono.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
