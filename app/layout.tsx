import "./globals.css";
import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";

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
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
