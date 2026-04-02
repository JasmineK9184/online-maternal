import type { Metadata } from "next";
import { Nunito_Sans, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const nunito = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MaternalCare Sync — Prenatal Scheduling",
  description:
    "Bridge clinical scheduling with your Google Calendar — personalized prenatal care and reminders.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${nunito.variable} ${sourceSerif.variable} min-h-screen font-sans`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
