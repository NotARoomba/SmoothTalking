import type { Metadata } from "next";
import { Geist, Geist_Mono, Jacques_Francois_Shadow } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jacquesFrancoisShadow = Jacques_Francois_Shadow({
  weight: "400",
  variable: "--font-jacques-francois-shadow",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Smooth Talking",
  description:
    "An app where you have to debate an AI into giving you all their coins.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${jacquesFrancoisShadow.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
