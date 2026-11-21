import { Footer } from "@/components/shell/Footer";
import { Navbar } from "@/components/shell/Navbar";
import { getSiteSettings } from "@/lib/db/settings";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSiteSettings();
  return (
    <div className="relative min-h-screen overflow-x-clip">
      <Navbar siteName={settings.site_name} />
      <main>{children}</main>
      <Footer settings={settings} />
    </div>
  );
}
