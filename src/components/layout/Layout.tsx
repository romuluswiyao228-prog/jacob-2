import { type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { AnnouncementBanner } from "./AnnouncementBanner";
import { WhatsAppButton } from "./WhatsAppButton";
import { useStoreSettings } from "@/lib/hooks";

export function Layout({ children }: { children: ReactNode }) {
  const { data: settings } = useStoreSettings();
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      {settings?.announcement_text && (
        <AnnouncementBanner text={settings.announcement_text} />
      )}
      <Header storeName={settings?.store_name ?? "JACOB DE JESUS"} />
      <main>{children}</main>
      <Footer settings={settings} />
      {settings?.whatsapp_number && (
        <WhatsAppButton phone={settings.whatsapp_number} />
      )}
    </>
  );
}
