/**
 * StoreMap — composant de carte OpenStreetMap avec Leaflet (npm, pas de CDN).
 * Chargé à la demande (lazy import depuis la page parente).
 * Accessible au clavier et sur mobile.
 */
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";
import styles from "./StoreMap.module.css";

interface StoreMapProps {
  lat: number;
  lng: number;
  label: string;
}

export default function StoreMap({ lat, lng, label }: StoreMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Empêche la double initialisation (React StrictMode)
    if (mapRef.current) return;

    let L: typeof import("leaflet");

    (async () => {
      // Import dynamique : Leaflet n'est chargé que quand le composant est monté
      L = await import("leaflet");

      // Icône par défaut : chemin résolu manuellement car Leaflet calcule
      // les chemins via require() ce qui ne marche pas avec Vite.
      const icon = L.icon({
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      if (!containerRef.current) return;

      const map = L.map(containerRef.current, {
        center: [lat, lng],
        zoom: 15,
        scrollWheelZoom: false, // évite les conflits avec le scroll de la page
        keyboard: true,
      });

      mapRef.current = map;

      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
      }).addTo(map);

      L.marker([lat, lng], { icon, title: label, keyboard: true, alt: label })
        .addTo(map)
        .bindPopup(label, { closeButton: true })
        .openPopup();
    })();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, label]);

  return (
    <div
      ref={containerRef}
      className={styles.map}
      role="application"
      aria-label={`Carte — ${label}`}
      tabIndex={0}
    />
  );
}
