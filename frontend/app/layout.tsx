import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IPL Auction",
  description: "Build your dream IPL team through live auctions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
