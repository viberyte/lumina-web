import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { PlansProvider } from "@/contexts/PlansContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Lumina - Your Nightlife Concierge",
  description: "Discover the perfect spots for any vibe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PlansProvider>
          {children}
        </PlansProvider>
      </body>
    </html>
  );
}
