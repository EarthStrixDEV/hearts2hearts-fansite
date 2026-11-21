import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import "./admin.css";

const plex = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · H2H Admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div id="ad-root" className={`ad ${plex.variable} ${plexMono.variable}`}>
      {children}
    </div>
  );
}
