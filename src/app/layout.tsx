import type { Metadata } from "next";
import { Caveat, Fredoka, IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-fredoka" });
const plexKr = IBM_Plex_Sans_KR({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-kr" });
const caveat = Caveat({ subsets: ["latin"], weight: ["600", "700"], variable: "--font-caveat" });

export const metadata: Metadata = {
  title: { default: "H2H·S2U — Hearts2Hearts fan site", template: "%s · H2H·S2U" },
  description: "An unofficial, fan-made home for Hearts2Hearts and S2U.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fredoka.variable} ${plexKr.variable} ${caveat.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
