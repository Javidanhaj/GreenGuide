import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Green Guide Karabakh",
  description: "Qarabağ üçün davamlı turizm planlaşdırıcısı",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="az">
      <body className={inter.variable}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
