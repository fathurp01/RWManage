import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AppProviders } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "RWManage — Platform Manajemen RW & Masjid",
    template: "%s | RWManage",
  },
  description:
    "Platform digital untuk mengelola iuran warga, kas RW, dan ZIS masjid dengan transparan, cepat, dan modern.",
  keywords: ["RW", "iuran warga", "kas RW", "ZIS", "masjid", "manajemen"],
  openGraph: {
    title: "RWManage — Platform Manajemen RW & Masjid",
    description:
      "Platform digital untuk mengelola iuran warga, kas RW, dan ZIS masjid.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
      className={cn(
        "h-full scroll-smooth antialiased",
        inter.variable,
        geistMono.variable
      )}
    >
      <body 
        className="min-h-full flex flex-col bg-background text-foreground"
        suppressHydrationWarning
      >
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
