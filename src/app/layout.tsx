import type { Metadata } from "next";
import { SpeedInsights } from '@vercel/speed-insights/next';
import "./globals.css";

export const metadata: Metadata = {
  title: "USE Stock Dashboard | Uganda Securities Exchange",
  description: "Real-time stock analysis, sentiment tracking, and corporate actions for Uganda Securities Exchange listed companies",
  keywords: ["USE", "Uganda Securities Exchange", "stocks", "sentiment analysis", "dividends", "DFCU", "Stanbic", "Uganda Clays"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-gradient-mesh min-h-screen">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
