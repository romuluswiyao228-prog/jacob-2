import { lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone, Clock, ExternalLink, MessageCircle } from "lucide-react";
import { useStoreSettings } from "@/lib/hooks";
import { Breadcrumb } from "@/components/ui";
import { SEO } from "@/components/SEO";
import styles from "./StorePage.module.css";

// Chargement à la demande — le bundle Leaflet n'est chargé que si
// les coordonnées sont renseignées et que le composant est rendu.
const StoreMap = lazy(() => import("@/components/ui/StoreMap"));

function MapFallback() {
  return <div className={styles.mapSkeleton} aria-busy="true" aria-label="Chargement de la carte…" />;
}

export default function StorePage() {
  const { data: settings, isLoading } = useStoreSettings();

  const lat = settings?.latitude ?? null;
  const lng = settings?.longitude ?? null;
  const hasCoords = lat !== null && lng !== null;

  const addressParts = [
    settings?.address,
    settings?.city,
    settings?.country,
  ]
    .map((p) => p?.trim())
    .filter(Boolean);
  const fullAddress = addressParts.join(", ");

  const mapsUrl =
    hasCoords
      ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
      : null;

  const breadcrumbs = [
    { label: "Accueil", href: "/" },
    { label: "Notre boutique" },
  ];

  return (
    <main className={styles.page}>
      <SEO
        title="Notre boutique"
        description="Retrouvez l'adresse, les horaires et l'itinéraire vers la boutique physique JACOB DE JESUS."
      />
      <Breadcrumb items={breadcrumbs} />

      <header className={styles.header}>
        <h1 className={styles.title}>Notre boutique</h1>
        {settings?.tagline && (
          <p className={styles.subtitle}>{settings.tagline}</p>
        )}
      </header>

      <div className={styles.layout}>
        {/* ── Colonne infos ── */}
        <aside className={styles.infoColumn}>
          {/* Adresse */}
          {fullAddress && (
            <div className={styles.infoBlock}>
              <div className={styles.infoIcon} aria-hidden="true">
                <MapPin size={18} />
              </div>
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>Adresse</span>
                <address className={styles.infoValue}>{fullAddress}</address>
              </div>
            </div>
          )}

          {/* Téléphone */}
          {settings?.phone && (
            <div className={styles.infoBlock}>
              <div className={styles.infoIcon} aria-hidden="true">
                <Phone size={18} />
              </div>
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>Téléphone</span>
                <a
                  href={`tel:${settings.phone}`}
                  className={styles.infoLink}
                  aria-label={`Appeler le ${settings.phone}`}
                >
                  {settings.phone}
                </a>
              </div>
            </div>
          )}

          {/* Horaires */}
          {settings?.opening_hours && (
            <div className={styles.infoBlock}>
              <div className={styles.infoIcon} aria-hidden="true">
                <Clock size={18} />
              </div>
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>Horaires</span>
                <pre className={styles.hours}>{settings.opening_hours}</pre>
              </div>
            </div>
          )}

          {/* Boutons d'action */}
          <div className={styles.actions}>
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.btnPrimary}
                aria-label="Obtenir l'itinéraire vers la boutique (Google Maps)"
              >
                <ExternalLink size={16} aria-hidden="true" />
                ITINÉRAIRE
              </a>
            )}
            <Link
              to="/contact"
              className={styles.btnSecondary}
              aria-label="Aller à la page de contact"
            >
              <MessageCircle size={16} aria-hidden="true" />
              CONTACTER
            </Link>
          </div>
        </aside>

        {/* ── Colonne carte ── */}
        <div className={styles.mapColumn}>
          {isLoading ? (
            <MapFallback />
          ) : hasCoords ? (
            <Suspense fallback={<MapFallback />}>
              <StoreMap
                lat={lat!}
                lng={lng!}
                label={
                  fullAddress ||
                  settings?.store_name ||
                  "Notre boutique"
                }
              />
            </Suspense>
          ) : (
            <div className={styles.noCoords} role="status">
              <MapPin size={32} aria-hidden="true" />
              <p>Localisation à configurer</p>
              <span className={styles.noCoordsSub}>
                Ajoutez vos coordonnées GPS dans les réglages de la boutique.
              </span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
