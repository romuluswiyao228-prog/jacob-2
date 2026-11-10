import { useState, useEffect, useRef } from "react";
import {
  Upload,
  Trash2,
  Save,
  Store,
  Phone,
  Clock,
  Share2,
  FileText,
  MapPin,
  Coins,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Images,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { resizeImage, resizeImageToMax1600 } from "@/lib/admin-utils";
import type { HomeSlide } from "@/lib/db-types";
import { useToast } from "@/components/ui/Toast";
import styles from "./AdminSettingsPage.module.css";

interface StoreSettingsData {
  id?: string;
  store_name: string;
  tagline: string;
  description: string;
  logo_url: string;
  banner_url: string;
  banner_mobile_url: string;
  email: string;
  phone: string;
  whatsapp_number: string;
  address: string;
  city: string;
  country: string;
  announcement_text: string;
  opening_hours: string;
  latitude: number | null;
  longitude: number | null;
  about_text: string;
  about_image_url: string;
  cgv: string;
  privacy_policy: string;
  legal_mentions: string;
  returns_policy: string;
  social_links: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    twitter?: string;
  };
  enabled_currencies?: string[];
}

const DEFAULT_SETTINGS: StoreSettingsData = {
  store_name: "JACOB DE JESUS",
  tagline: "Streetwear brutal, épuré, intemporel.",
  description: "Boutique officielle de la maison JACOB DE JESUS.",
  logo_url: "",
  banner_url: "",
  banner_mobile_url: "",
  email: "contact@jacobdejesus.com",
  phone: "+228 90 00 00 00",
  whatsapp_number: "22890000000",
  address: "Boulevard du 13 Janvier",
  city: "Lomé",
  country: "Togo",
  announcement_text: "Livraison offerte à Lomé dès 50 000 FCFA d'achats.",
  opening_hours: "Lundi au Samedi : 09h00 – 19h30\nDimanche : Fermé",
  latitude: 6.13748,
  longitude: 1.21227,
  about_text: "",
  about_image_url: "",
  cgv: "",
  privacy_policy: "",
  legal_mentions: "",
  returns_policy: "",
  social_links: {
    instagram: "",
    facebook: "",
    tiktok: "",
    twitter: "",
  },
  enabled_currencies: ["XOF", "EUR", "USD"],
};

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<StoreSettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshingRates, setRefreshingRates] = useState(false);
  const [ratesLastUpdated, setRatesLastUpdated] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingBannerMobile, setUploadingBannerMobile] = useState(false);
  const [uploadingAboutImage, setUploadingAboutImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bannerWarning, setBannerWarning] = useState<string | null>(null);
  const [slides, setSlides] = useState<HomeSlide[]>([]);
  const [uploadingSlideSide, setUploadingSlideSide] = useState<"left" | "right" | null>(null);
  const [slideWarning, setSlideWarning] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const bannerMobileInputRef = useRef<HTMLInputElement>(null);
  const aboutImageInputRef = useRef<HTMLInputElement>(null);
  const leftSlidesInputRef = useRef<HTMLInputElement>(null);
  const rightSlidesInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const { data, error: err } = await supabase
          .from("store_settings")
          .select("*")
          .limit(1)
          .maybeSingle();

        if (err) throw err;

        if (data) {
          setSettings({
            id: data.id,
            store_name: data.store_name || "",
            tagline: data.tagline || "",
            description: data.description || "",
            logo_url: data.logo_url || "",
            banner_url: data.banner_url || "",
            banner_mobile_url: data.banner_mobile_url || "",
            email: data.email || "",
            phone: data.phone || "",
            whatsapp_number: data.whatsapp_number || "",
            address: data.address || "",
            city: data.city || "",
            country: data.country || "Togo",
            announcement_text: data.announcement_text || "",
            opening_hours: data.opening_hours || "",
            latitude: data.latitude !== undefined && data.latitude !== null ? Number(data.latitude) : null,
            longitude: data.longitude !== undefined && data.longitude !== null ? Number(data.longitude) : null,
            about_text: data.about_text || "",
            about_image_url: data.about_image_url || "",
            cgv: data.cgv || "",
            privacy_policy: data.privacy_policy || "",
            legal_mentions: data.legal_mentions || "",
            returns_policy: data.returns_policy || "",
            social_links: data.social_links && typeof data.social_links === "object"
              ? data.social_links
              : {},
            enabled_currencies: Array.isArray(data.enabled_currencies)
              ? data.enabled_currencies
              : ["XOF", "EUR", "USD"],
          });
        }

        const { data: ratesData } = await supabase
          .from("exchange_rates")
          .select("mis_a_jour")
          .order("mis_a_jour", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ratesData) {
          setRatesLastUpdated(ratesData.mis_a_jour);
        }

        const { data: slidesData } = await supabase
          .from("home_slides")
          .select("*")
          .order("sort_order", { ascending: true });

        if (slidesData) {
          setSlides(slidesData as HomeSlide[]);
        }
      } catch (e: unknown) {
        console.error("Erreur de chargement des réglages", e);
        setError("Impossible de charger les réglages de la boutique.");
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  const handleChange = (
    field: keyof StoreSettingsData,
    value: string | number | null
  ) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (network: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      social_links: {
        ...prev.social_links,
        [network]: value,
      },
    }));
  };

  const CURRENCY_OPTIONS = [
    { code: "XOF", label: "Franc CFA (XOF)", note: "Devise officielle du magasin", locked: true },
    { code: "EUR", label: "Euro (EUR)", note: "Parité fixe 1 EUR = 655,957 XOF" },
    { code: "USD", label: "Dollar américain (USD)", note: "Taux indicatif" },
    { code: "GBP", label: "Livre sterling (GBP)", note: "Taux indicatif" },
    { code: "CAD", label: "Dollar canadien (CAD)", note: "Taux indicatif" },
    { code: "JPY", label: "Yen japonais (JPY)", note: "Taux indicatif sans décimales" },
    { code: "CHF", label: "Franc suisse (CHF)", note: "Taux indicatif" },
    { code: "CNY", label: "Yuan chinois (CNY)", note: "Taux indicatif" },
  ];

  const toggleCurrency = (code: string) => {
    if (code === "XOF") return;
    setSettings((prev) => {
      const current = prev.enabled_currencies || ["XOF", "EUR", "USD"];
      const next = current.includes(code)
        ? current.filter((c) => c !== code)
        : [...current, code];
      return { ...prev, enabled_currencies: next };
    });
  };

  const handleRefreshRates = async () => {
    try {
      setRefreshingRates(true);
      setError(null);

      // Appel de l'Edge function refresh-exchange-rates
      const { error: fnErr } = await supabase.functions.invoke("refresh-exchange-rates");
      if (fnErr) {
        console.warn("Edge function refresh-exchange-rates:", fnErr.message);
      }

      // Re-vérifier la table exchange_rates
      const { data: ratesData, error: ratesErr } = await supabase
        .from("exchange_rates")
        .select("mis_a_jour")
        .order("mis_a_jour", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ratesErr) throw ratesErr;

      const updated = ratesData?.mis_a_jour || new Date().toISOString();
      setRatesLastUpdated(updated);
      showToast("Taux de change actualisés avec succès", "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de l'actualisation des taux.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setRefreshingRates(false);
    }
  };

  const handleUploadImage = async (
    file: File,
    type: "logo" | "banner" | "banner_mobile" | "about"
  ) => {
    try {
      if (type === "logo") setUploadingLogo(true);
      else if (type === "banner") setUploadingBanner(true);
      else if (type === "banner_mobile") setUploadingBannerMobile(true);
      else setUploadingAboutImage(true);
      setError(null);

      if (type === "banner") {
        // Vérification non bloquante des dimensions
        const testImg = new Image();
        const testUrl = URL.createObjectURL(file);
        await new Promise<void>((resolve) => {
          testImg.onload = () => {
            URL.revokeObjectURL(testUrl);
            const w = testImg.naturalWidth || testImg.width;
            const h = testImg.naturalHeight || testImg.height;
            if (h > w || w < 1600) {
              setBannerWarning(
                "Cette photo est verticale ou trop petite : elle sera floue en bannière. Utilisez une photo horizontale d'au moins 1600 px de large."
              );
            } else {
              setBannerWarning(null);
            }
            resolve();
          };
          testImg.onerror = () => {
            URL.revokeObjectURL(testUrl);
            resolve();
          };
          testImg.src = testUrl;
        });
      }

      // Bannière ordi : max 2400px et qualité 0.9. Bannière mobile / Présentation : max 1600px et qualité 0.9. Logo : max 1600px et qualité 0.85
      const resizedBlob =
        type === "banner"
          ? await resizeImage(file, { maxDimension: 2400, quality: 0.9 })
          : type === "banner_mobile" || type === "about"
          ? await resizeImage(file, { maxDimension: 1600, quality: 0.9 })
          : await resizeImageToMax1600(file);

      const ext = file.type === "image/png" ? "png" : "webp";
      const fileName = `${type}_${Date.now()}.${ext}`;
      const filePath = `branding/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("store-assets")
        .upload(filePath, resizedBlob, {
          contentType: resizedBlob.type,
          upsert: true,
        });

      if (uploadErr) throw uploadErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("store-assets").getPublicUrl(filePath);

      if (type === "logo") {
        setSettings((prev) => ({ ...prev, logo_url: publicUrl }));
      } else if (type === "banner") {
        setSettings((prev) => ({ ...prev, banner_url: publicUrl }));
      } else if (type === "banner_mobile") {
        setSettings((prev) => ({ ...prev, banner_mobile_url: publicUrl }));
      } else {
        setSettings((prev) => ({ ...prev, about_image_url: publicUrl }));
      }

      showToast(
        type === "logo"
          ? "Logo mis à jour !"
          : type === "banner"
          ? "Bannière mise à jour !"
          : type === "banner_mobile"
          ? "Bannière mobile mise à jour !"
          : "Photo de présentation mise à jour !",
        "success"
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors du téléversement.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      if (type === "logo") setUploadingLogo(false);
      else if (type === "banner") setUploadingBanner(false);
      else if (type === "banner_mobile") setUploadingBannerMobile(false);
      else setUploadingAboutImage(false);
    }
  };

  const handleUploadSlides = async (
    files: FileList | null,
    side: "left" | "right"
  ) => {
    if (!files || files.length === 0) return;
    try {
      setUploadingSlideSide(side);
      setSlideWarning(null);

      const fileArr = Array.from(files);
      let warningDetected = false;

      // Vérification non bloquante des dimensions
      for (const file of fileArr) {
        await new Promise<void>((resolve) => {
          const testImg = new Image();
          const testUrl = URL.createObjectURL(file);
          testImg.onload = () => {
            URL.revokeObjectURL(testUrl);
            const w = testImg.naturalWidth || testImg.width;
            const h = testImg.naturalHeight || testImg.height;
            if (h < w || h < 1000) {
              warningDetected = true;
            }
            resolve();
          };
          testImg.onerror = () => {
            URL.revokeObjectURL(testUrl);
            resolve();
          };
          testImg.src = testUrl;
        });
      }

      if (warningDetected) {
        setSlideWarning(
          "Photo verticale d'au moins 1000 px de haut recommandée."
        );
      }

      let currentActiveCount = slides.filter(
        (s) => s.side === side && s.is_active !== false
      ).length;

      const sideSlides = slides.filter((s) => s.side === side);
      let maxOrder = sideSlides.reduce((max, s) => Math.max(max, s.sort_order), -1);

      const newSlides: HomeSlide[] = [];

      for (const file of fileArr) {
        const resizedBlob = await resizeImage(file, {
          maxDimension: 1600,
          quality: 0.9,
        });

        const ext = file.type === "image/png" ? "png" : "webp";
        const fileName = `${side}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const filePath = `home-slides/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from("store-assets")
          .upload(filePath, resizedBlob, {
            contentType: resizedBlob.type,
            upsert: true,
          });

        if (uploadErr) throw uploadErr;

        const {
          data: { publicUrl },
        } = supabase.storage.from("store-assets").getPublicUrl(filePath);

        const shouldBeActive = currentActiveCount < 6;
        if (shouldBeActive) {
          currentActiveCount += 1;
        }

        const defaultAlt =
          file.name.replace(/\.[^/.]+$/, "").trim() || "Photo d'accueil";
        maxOrder += 1;

        const { data: inserted, error: insertErr } = await supabase
          .from("home_slides")
          .insert({
            image_url: publicUrl,
            alt_text: defaultAlt,
            side,
            sort_order: maxOrder,
            is_active: shouldBeActive,
          })
          .select()
          .single();

        if (insertErr) throw insertErr;
        if (inserted) newSlides.push(inserted as HomeSlide);
      }

      setSlides((prev) => [...prev, ...newSlides]);
      showToast(`${fileArr.length} photo(s) ajoutée(s).`, "success");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de l'envoi des photos.";
      showToast(msg, "error");
    } finally {
      setUploadingSlideSide(null);
    }
  };

  const handleToggleSlideActive = async (slide: HomeSlide) => {
    const nextActive = !slide.is_active;
    if (nextActive) {
      const activeCount = slides.filter(
        (s) => s.side === slide.side && s.is_active !== false && s.id !== slide.id
      ).length;
      if (activeCount >= 6) {
        showToast("Maximum 6 photos actives par côté.", "error");
        return;
      }
    }

    setSlides((prev) =>
      prev.map((s) => (s.id === slide.id ? { ...s, is_active: nextActive } : s))
    );

    const { error: err } = await supabase
      .from("home_slides")
      .update({ is_active: nextActive })
      .eq("id", slide.id);

    if (err) {
      showToast(err.message, "error");
      setSlides((prev) =>
        prev.map((s) => (s.id === slide.id ? { ...s, is_active: slide.is_active } : s))
      );
    } else {
      showToast(
        nextActive ? "Photo activée sur l'accueil." : "Photo masquée de l'accueil.",
        "success"
      );
    }
  };

  const handleUpdateSlideAlt = async (id: string, newAlt: string) => {
    const trimmed = newAlt.trim();
    if (!trimmed) {
      showToast("Le texte alternatif est obligatoire.", "error");
      return;
    }

    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, alt_text: trimmed } : s))
    );

    const { error: err } = await supabase
      .from("home_slides")
      .update({ alt_text: trimmed })
      .eq("id", id);

    if (err) {
      showToast("Erreur lors de la mise à jour du texte alternatif.", "error");
    } else {
      showToast("Texte alternatif mis à jour.", "success");
    }
  };

  const handleMoveSlide = async (slide: HomeSlide, direction: "up" | "down") => {
    const sideSlides = slides
      .filter((s) => s.side === slide.side)
      .sort((a, b) => a.sort_order - b.sort_order);

    const idx = sideSlides.findIndex((s) => s.id === slide.id);
    if (idx === -1) return;
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sideSlides.length) return;

    const targetSlide = sideSlides[targetIdx];
    const currentOrder = slide.sort_order;
    const targetOrder = targetSlide.sort_order;

    setSlides((prev) =>
      prev.map((s) => {
        if (s.id === slide.id) return { ...s, sort_order: targetOrder };
        if (s.id === targetSlide.id) return { ...s, sort_order: currentOrder };
        return s;
      })
    );

    await Promise.all([
      supabase
        .from("home_slides")
        .update({ sort_order: targetOrder })
        .eq("id", slide.id),
      supabase
        .from("home_slides")
        .update({ sort_order: currentOrder })
        .eq("id", targetSlide.id),
    ]);
  };

  const handleDeleteSlide = async (id: string) => {
    if (!window.confirm("Supprimer cette photo d'accueil ?")) return;
    setSlides((prev) => prev.filter((s) => s.id !== id));
    const { error: err } = await supabase.from("home_slides").delete().eq("id", id);
    if (err) {
      showToast("Erreur lors de la suppression de la photo.", "error");
    } else {
      showToast("Photo supprimée.", "success");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation WhatsApp (chiffres seulement, 8 à 15 chiffres)
    const cleanWa = settings.whatsapp_number.trim().replace(/[^0-9]/g, "");
    if (settings.whatsapp_number.trim() && !/^[0-9]{8,15}$/.test(cleanWa)) {
      setError(
        "Le numéro WhatsApp doit contenir uniquement des chiffres au format international (ex: 22890123456, sans + ni espace)."
      );
      showToast("Numéro WhatsApp invalide", "error");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        store_name: settings.store_name.trim(),
        tagline: settings.tagline.trim() || null,
        description: settings.description.trim() || null,
        logo_url: settings.logo_url || null,
        banner_url: settings.banner_url || null,
        banner_mobile_url: settings.banner_mobile_url || null,
        email: settings.email.trim() || null,
        phone: settings.phone.trim() || null,
        whatsapp_number: cleanWa || null,
        address: settings.address.trim() || null,
        city: settings.city.trim() || null,
        country: settings.country.trim() || "Togo",
        announcement_text: settings.announcement_text.trim() || null,
        opening_hours: settings.opening_hours.trim() || null,
        latitude: settings.latitude !== null && !isNaN(Number(settings.latitude)) ? Number(settings.latitude) : null,
        longitude: settings.longitude !== null && !isNaN(Number(settings.longitude)) ? Number(settings.longitude) : null,
        about_text: settings.about_text.trim() || null,
        about_image_url: settings.about_image_url || null,
        cgv: settings.cgv.trim() || null,
        privacy_policy: settings.privacy_policy.trim() || null,
        legal_mentions: settings.legal_mentions.trim() || null,
        returns_policy: settings.returns_policy.trim() || null,
        social_links: settings.social_links || {},
        enabled_currencies: settings.enabled_currencies || ["XOF", "EUR", "USD"],
        updated_at: new Date().toISOString(),
      };

      if (settings.id) {
        const { error: updateErr } = await supabase
          .from("store_settings")
          .update(payload)
          .eq("id", settings.id);

        if (updateErr) throw updateErr;
      } else {
        const { data: newRow, error: insertErr } = await supabase
          .from("store_settings")
          .insert(payload)
          .select("id")
          .single();

        if (insertErr) throw insertErr;
        if (newRow) setSettings((prev) => ({ ...prev, id: newRow.id }));
      }

      setSuccess("Réglages enregistrés avec succès.");
      showToast("Réglages de la boutique enregistrés avec succès", "success");
    } catch (e: unknown) {
      console.error("Erreur enregistrement réglages", e);
      const msg = e instanceof Error ? e.message : "Erreur lors de l'enregistrement.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Réglages</h1>
        </div>
        <p style={{ color: "var(--color-neutral-400)" }}>Chargement des réglages…</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Réglages</h1>
          <p className={styles.subtitle}>
            Configuration globale de la boutique JACOB DE JESUS, image de marque, coordonnées et textes légaux.
          </p>
        </div>
      </header>

      {error && <div className={styles.alertBox}>{error}</div>}
      {success && <div className={styles.successBox}>{success}</div>}

      <form className={styles.form} onSubmit={handleSubmit}>
        {/* Section 1 : Identité & Médias */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Store size={18} color="var(--color-brand)" />
              <h2 className={styles.sectionTitle}>Identité & Médias</h2>
            </div>
            <p className={styles.sectionDesc}>
              Nom, slogan, logo officiel et bannière principale (stockés sur le bucket store-assets).
            </p>
          </div>

          <div className={styles.sectionBody}>
            <div className={styles.fieldsGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="store_name">
                  Nom de la boutique *
                </label>
                <input
                  id="store_name"
                  type="text"
                  required
                  value={settings.store_name}
                  onChange={(e) => handleChange("store_name", e.target.value)}
                  className={styles.input}
                  placeholder="ex: JACOB DE JESUS"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="tagline">
                  Slogan (Tagline) <span className={styles.fieldLabelOptional}>Facultatif</span>
                </label>
                <input
                  id="tagline"
                  type="text"
                  value={settings.tagline}
                  onChange={(e) => handleChange("tagline", e.target.value)}
                  className={styles.input}
                  placeholder="ex: Streetwear brutal, épuré, intemporel"
                />
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="description">
                Description générale
              </label>
              <textarea
                id="description"
                value={settings.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className={styles.textarea}
                placeholder="Description concise pour le référencement et les réseaux..."
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="announcement_text">
                Texte du bandeau d'annonce <span className={styles.fieldLabelOptional}>Bannière haute du site</span>
              </label>
              <input
                id="announcement_text"
                type="text"
                value={settings.announcement_text}
                onChange={(e) => handleChange("announcement_text", e.target.value)}
                className={styles.input}
                placeholder="ex: Livraison offerte à Lomé dès 50 000 FCFA d'achats."
              />
              <span className={styles.fieldHelp}>
                Ce texte défile ou s'affiche en tête de toutes les pages publiques du site.
              </span>
            </div>

            {/* Logo Upload */}
            <div className={styles.fieldsGrid}>
              <div className={styles.imageUploadBox}>
                <label className={styles.fieldLabel}>Logo de la boutique</label>
                <div className={styles.imagePreviewWrap}>
                  {settings.logo_url ? (
                    <img
                      src={settings.logo_url}
                      alt="Logo de la boutique"
                      className={styles.logoPreview}
                    />
                  ) : (
                    <span className={styles.imagePlaceholder}>Aucun logo configuré</span>
                  )}
                </div>
                <div className={styles.uploadActions}>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className={styles.fileInputHidden}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImage(file, "logo");
                    }}
                  />
                  <button
                    type="button"
                    className={styles.uploadBtn}
                    disabled={uploadingLogo}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload size={14} />
                    <span>{uploadingLogo ? "Envoi…" : "Changer le logo"}</span>
                  </button>
                  {settings.logo_url && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => handleChange("logo_url", "")}
                    >
                      <Trash2 size={13} />
                      <span>Retirer</span>
                    </button>
                  )}
                </div>
                <span className={styles.fieldHelp}>
                  Format JPEG, PNG ou WEBP (max 5 Mo, redimensionné automatiquement).
                </span>
              </div>

              {/* Banner Upload */}
              <div className={styles.imageUploadBox}>
                <label className={styles.fieldLabel}>Bannière de la boutique</label>
                <div className={styles.imagePreviewWrap}>
                  {settings.banner_url ? (
                    <img
                      src={settings.banner_url}
                      alt="Bannière d'accueil"
                      className={styles.bannerPreview}
                    />
                  ) : (
                    <span className={styles.imagePlaceholder}>Aucune bannière configurée</span>
                  )}
                </div>
                <div className={styles.uploadActions}>
                  <input
                    ref={bannerInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className={styles.fileInputHidden}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImage(file, "banner");
                    }}
                  />
                  <button
                    type="button"
                    className={styles.uploadBtn}
                    disabled={uploadingBanner}
                    onClick={() => bannerInputRef.current?.click()}
                  >
                    <Upload size={14} />
                    <span>{uploadingBanner ? "Envoi…" : "Changer la bannière"}</span>
                  </button>
                  {settings.banner_url && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => {
                        handleChange("banner_url", "");
                        setBannerWarning(null);
                      }}
                    >
                      <Trash2 size={13} />
                      <span>Retirer</span>
                    </button>
                  )}
                </div>
                <span className={styles.fieldHelp}>
                  Photo horizontale d'au moins 2000 px de large, sujet au centre. 500 Ko à 1 Mo maximum.
                </span>
                {bannerWarning && (
                  <div
                    className={styles.alertBox}
                    style={{ marginTop: "var(--space-2)" }}
                    role="alert"
                  >
                    {bannerWarning}
                  </div>
                )}
              </div>

              {/* Banner Mobile Upload */}
              <div className={styles.imageUploadBox}>
                <label className={styles.fieldLabel}>
                  Photo de bannière pour téléphone (verticale, facultative)
                </label>
                <div className={styles.imagePreviewWrap}>
                  {settings.banner_mobile_url ? (
                    <img
                      src={settings.banner_mobile_url}
                      alt="Bannière pour téléphone"
                      className={styles.bannerPreview}
                    />
                  ) : (
                    <span className={styles.imagePlaceholder}>Aucune bannière mobile configurée</span>
                  )}
                </div>
                <div className={styles.uploadActions}>
                  <input
                    ref={bannerMobileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className={styles.fileInputHidden}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUploadImage(file, "banner_mobile");
                    }}
                  />
                  <button
                    type="button"
                    className={styles.uploadBtn}
                    disabled={uploadingBannerMobile}
                    onClick={() => bannerMobileInputRef.current?.click()}
                  >
                    <Upload size={14} />
                    <span>{uploadingBannerMobile ? "Envoi…" : "Changer la bannière mobile"}</span>
                  </button>
                  {settings.banner_mobile_url && (
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => handleChange("banner_mobile_url", "")}
                    >
                      <Trash2 size={13} />
                      <span>Retirer</span>
                    </button>
                  )}
                </div>
                <span className={styles.fieldHelp}>
                  Photo verticale 1080 × 1350 px minimum, sujet au centre.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section : Photos d'accueil */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Images size={18} color="var(--color-brand)" />
              <h2 className={styles.sectionTitle}>Photos d'accueil</h2>
            </div>
            <p className={styles.sectionDesc}>
              Deux cadres photo verticaux alternés (6 photos actives maximum par cadre, ratio portrait recommandé).
            </p>
          </div>

          <div className={styles.sectionBody}>
            {slideWarning && (
              <div className={styles.warningBox} role="alert">
                {slideWarning}
              </div>
            )}

            <div className={styles.slidesGrid}>
              {(["left", "right"] as const).map((side) => {
                const sideLabel = side === "left" ? "Cadre gauche" : "Cadre droit";
                const sideSlides = slides
                  .filter((s) => s.side === side)
                  .sort((a, b) => a.sort_order - b.sort_order);
                const activeCount = sideSlides.filter((s) => s.is_active !== false).length;
                const inputRef = side === "left" ? leftSlidesInputRef : rightSlidesInputRef;
                const isUploading = uploadingSlideSide === side;

                return (
                  <div key={side} className={styles.sideColumn}>
                    <div className={styles.sideHeader}>
                      <div>
                        <h3 className={styles.sideTitle}>{sideLabel}</h3>
                        <span className={styles.sideCounter}>
                          {activeCount} / 6 active{activeCount > 1 ? "s" : ""}
                        </span>
                      </div>
                      <input
                        ref={inputRef}
                        type="file"
                        multiple
                        accept="image/jpeg,image/png,image/webp"
                        className={styles.fileInputHidden}
                        onChange={(e) => {
                          handleUploadSlides(e.target.files, side);
                          e.target.value = "";
                        }}
                      />
                      <button
                        type="button"
                        className={styles.sideUploadBtn}
                        disabled={isUploading}
                        onClick={() => inputRef.current?.click()}
                      >
                        <Upload size={14} />
                        <span>{isUploading ? "Envoi…" : "Ajouter des photos"}</span>
                      </button>
                    </div>

                    <div className={styles.slideList}>
                      {sideSlides.length === 0 ? (
                        <p className={styles.slideEmpty}>
                          Aucune photo pour le {sideLabel.toLowerCase()}.
                        </p>
                      ) : (
                        sideSlides.map((slide, idx) => (
                          <div key={slide.id} className={styles.slideCard}>
                            <img
                              src={slide.image_url}
                              alt={slide.alt_text}
                              className={styles.slideThumb}
                            />
                            <div className={styles.slideInfo}>
                              <div className={styles.slideTopMeta}>
                                <span
                                  className={
                                    slide.is_active
                                      ? styles.slideBadgeActive
                                      : styles.slideBadgeHidden
                                  }
                                >
                                  {slide.is_active ? "Active" : "Masquée"}
                                </span>
                              </div>
                              <input
                                type="text"
                                required
                                aria-label={`Texte alternatif pour ${slide.alt_text || "photo"}`}
                                value={slide.alt_text}
                                placeholder="Texte alternatif (obligatoire) *"
                                className={styles.slideAltInput}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSlides((prev) =>
                                    prev.map((s) =>
                                      s.id === slide.id ? { ...s, alt_text: val } : s
                                    )
                                  );
                                }}
                                onBlur={(e) => handleUpdateSlideAlt(slide.id, e.target.value)}
                              />
                            </div>
                            <div className={styles.slideActions}>
                              <button
                                type="button"
                                title="Monter"
                                disabled={idx === 0}
                                className={styles.slideActionBtn}
                                onClick={() => handleMoveSlide(slide, "up")}
                              >
                                <ArrowUp size={14} />
                              </button>
                              <button
                                type="button"
                                title="Descendre"
                                disabled={idx === sideSlides.length - 1}
                                className={styles.slideActionBtn}
                                onClick={() => handleMoveSlide(slide, "down")}
                              >
                                <ArrowDown size={14} />
                              </button>
                              <button
                                type="button"
                                title={slide.is_active ? "Masquer" : "Activer"}
                                className={styles.slideActionBtn}
                                onClick={() => handleToggleSlideActive(slide)}
                              >
                                {slide.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                              <button
                                type="button"
                                title="Supprimer"
                                className={`${styles.slideActionBtn} ${styles.slideActionBtnDelete}`}
                                onClick={() => handleDeleteSlide(slide.id)}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section 2 : Contacts & Numéro WhatsApp */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Phone size={18} color="var(--color-brand)" />
              <h2 className={styles.sectionTitle}>Coordonnées & WhatsApp</h2>
            </div>
            <p className={styles.sectionDesc}>
              Canaux de communication directs avec les clients.
            </p>
          </div>

          <div className={styles.sectionBody}>
            <div className={styles.fieldsGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="email">
                  Adresse e-mail de contact
                </label>
                <input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  className={styles.input}
                  placeholder="contact@jacobdejesus.com"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="phone">
                  Téléphone d'appel
                </label>
                <input
                  id="phone"
                  type="text"
                  value={settings.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  className={styles.input}
                  placeholder="+228 90 00 00 00"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="whatsapp_number">
                  Numéro WhatsApp officiel *
                </label>
                <input
                  id="whatsapp_number"
                  type="text"
                  required
                  value={settings.whatsapp_number}
                  onChange={(e) => {
                    // Chiffres seulement
                    const digits = e.target.value.replace(/[^0-9]/g, "");
                    handleChange("whatsapp_number", digits);
                  }}
                  className={styles.input}
                  placeholder="22890000000"
                />
                <span className={styles.fieldHelp}>
                  <strong>Chiffres uniquement</strong> au format international, sans signe + ni espaces (ex: <code>22890000000</code>). Utilisé pour initier les conversations WhatsApp.
                </span>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="country">
                  Pays d'origine
                </label>
                <input
                  id="country"
                  type="text"
                  value={settings.country}
                  onChange={(e) => handleChange("country", e.target.value)}
                  className={styles.input}
                  placeholder="Togo"
                />
              </div>
            </div>

            <div className={styles.fieldsGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="address">
                  Adresse physique
                </label>
                <input
                  id="address"
                  type="text"
                  value={settings.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className={styles.input}
                  placeholder="Boulevard du 13 Janvier, Quartier Déckon"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="city">
                  Ville
                </label>
                <input
                  id="city"
                  type="text"
                  value={settings.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  className={styles.input}
                  placeholder="Lomé"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3 : Horaires & Géolocalisation */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={18} color="var(--color-brand)" />
              <h2 className={styles.sectionTitle}>Horaires & Localisation GPS</h2>
            </div>
            <p className={styles.sectionDesc}>
              Heures d'ouverture de la boutique physique et coordonnées GPS.
            </p>
          </div>

          <div className={styles.sectionBody}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="opening_hours">
                Horaires d'ouverture
              </label>
              <textarea
                id="opening_hours"
                value={settings.opening_hours}
                onChange={(e) => handleChange("opening_hours", e.target.value)}
                className={styles.textarea}
                placeholder={"Lundi au Samedi : 09h00 – 19h30\nDimanche : Fermé"}
              />
            </div>

            <div className={styles.fieldsGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="latitude">
                  <MapPin size={12} />
                  <span>Latitude</span>
                </label>
                <input
                  id="latitude"
                  type="number"
                  step="any"
                  value={settings.latitude ?? ""}
                  onChange={(e) =>
                    handleChange(
                      "latitude",
                      e.target.value === "" ? null : parseFloat(e.target.value)
                    )
                  }
                  className={styles.input}
                  placeholder="ex: 6.13748"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="longitude">
                  <MapPin size={12} />
                  <span>Longitude</span>
                </label>
                <input
                  id="longitude"
                  type="number"
                  step="any"
                  value={settings.longitude ?? ""}
                  onChange={(e) =>
                    handleChange(
                      "longitude",
                      e.target.value === "" ? null : parseFloat(e.target.value)
                    )
                  }
                  className={styles.input}
                  placeholder="ex: 1.21227"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4 : Réseaux sociaux */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Share2 size={18} color="var(--color-brand)" />
              <h2 className={styles.sectionTitle}>Réseaux Sociaux</h2>
            </div>
            <p className={styles.sectionDesc}>
              Liens publics intégrés dans l'en-tête et le pied de page du site.
            </p>
          </div>

          <div className={styles.sectionBody}>
            <div className={styles.fieldsGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="social_instagram">
                  Instagram
                </label>
                <input
                  id="social_instagram"
                  type="url"
                  value={settings.social_links?.instagram || ""}
                  onChange={(e) => handleSocialChange("instagram", e.target.value)}
                  className={styles.input}
                  placeholder="https://instagram.com/jacobdejesus"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="social_tiktok">
                  TikTok
                </label>
                <input
                  id="social_tiktok"
                  type="url"
                  value={settings.social_links?.tiktok || ""}
                  onChange={(e) => handleSocialChange("tiktok", e.target.value)}
                  className={styles.input}
                  placeholder="https://tiktok.com/@jacobdejesus"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="social_facebook">
                  Facebook
                </label>
                <input
                  id="social_facebook"
                  type="url"
                  value={settings.social_links?.facebook || ""}
                  onChange={(e) => handleSocialChange("facebook", e.target.value)}
                  className={styles.input}
                  placeholder="https://facebook.com/jacobdejesus"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="social_twitter">
                  Twitter / X
                </label>
                <input
                  id="social_twitter"
                  type="url"
                  value={settings.social_links?.twitter || ""}
                  onChange={(e) => handleSocialChange("twitter", e.target.value)}
                  className={styles.input}
                  placeholder="https://x.com/jacobdejesus"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 5 : Textes légaux & Présentation */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <FileText size={18} color="var(--color-brand)" />
              <h2 className={styles.sectionTitle}>Textes Légaux & Présentation</h2>
            </div>
            <p className={styles.sectionDesc}>
              CGV, mentions légales, politique de confidentialité, politique de retours et manifeste de marque.
            </p>
          </div>

          <div className={styles.sectionBody}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="about_text">
                À propos / Histoire de la marque
              </label>
              <textarea
                id="about_text"
                value={settings.about_text}
                onChange={(e) => handleChange("about_text", e.target.value)}
                className={`${styles.textarea} ${styles.textareaLarge}`}
                placeholder="Racontez la vision de JACOB DE JESUS..."
              />
            </div>

            {/* Photo de présentation */}
            <div className={styles.imageUploadBox}>
              <label className={styles.fieldLabel}>Photo de présentation</label>
              <div className={styles.imagePreviewWrap}>
                {settings.about_image_url ? (
                  <img
                    src={settings.about_image_url}
                    alt="Photo de présentation"
                    className={styles.bannerPreview}
                  />
                ) : (
                  <span className={styles.imagePlaceholder}>Aucune photo de présentation</span>
                )}
              </div>
              <div className={styles.uploadActions}>
                <input
                  ref={aboutImageInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className={styles.fileInputHidden}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadImage(file, "about");
                  }}
                />
                <button
                  type="button"
                  className={styles.uploadBtn}
                  disabled={uploadingAboutImage}
                  onClick={() => aboutImageInputRef.current?.click()}
                >
                  <Upload size={14} />
                  <span>{uploadingAboutImage ? "Envoi…" : "Changer la photo"}</span>
                </button>
                {settings.about_image_url && (
                  <button
                    type="button"
                    className={styles.removeBtn}
                    onClick={() => handleChange("about_image_url", "")}
                  >
                    <Trash2 size={13} />
                    <span>Retirer</span>
                  </button>
                )}
              </div>
              <span className={styles.fieldHelp}>
                Photo illustrant la marque (format 4:5 recommandé, max 1600 px, 5 Mo maximum).
              </span>
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="cgv">
                Conditions Générales de Vente (CGV)
              </label>
              <textarea
                id="cgv"
                value={settings.cgv}
                onChange={(e) => handleChange("cgv", e.target.value)}
                className={`${styles.textarea} ${styles.textareaLarge}`}
                placeholder="Dispositions relatives aux commandes, prix, expéditions et garanties..."
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="privacy_policy">
                Politique de Confidentialité
              </label>
              <textarea
                id="privacy_policy"
                value={settings.privacy_policy}
                onChange={(e) => handleChange("privacy_policy", e.target.value)}
                className={`${styles.textarea} ${styles.textareaLarge}`}
                placeholder="Traitement des données personnelles des clients..."
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="legal_mentions">
                Mentions Légales
              </label>
              <textarea
                id="legal_mentions"
                value={settings.legal_mentions}
                onChange={(e) => handleChange("legal_mentions", e.target.value)}
                className={`${styles.textarea} ${styles.textareaLarge}`}
                placeholder="Raison sociale, immatriculation, hébergement..."
              />
            </div>

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel} htmlFor="returns_policy">
                Politique de Retours et Échanges
              </label>
              <textarea
                id="returns_policy"
                value={settings.returns_policy}
                onChange={(e) => handleChange("returns_policy", e.target.value)}
                className={`${styles.textarea} ${styles.textareaLarge}`}
                placeholder="Conditions de retour sous 14 jours, état des articles et modalités de remboursement..."
              />
            </div>
          </div>
        </div>

        {/* Section 6 : Devises & Taux de change */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Coins size={18} color="var(--color-brand)" />
              <h2 className={styles.sectionTitle}>Devises & Taux de Change</h2>
            </div>
            <p className={styles.sectionDesc}>
              Devises activées pour les conversions indicatives (la boutique et la commande restent toujours en XOF).
            </p>
          </div>

          <div className={styles.sectionBody}>
            {/* Statut & Actualisation */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "var(--space-3)",
                padding: "var(--space-4)",
                background: "var(--color-neutral-900)",
                border: "1px solid var(--color-neutral-700)",
                borderRadius: "var(--radius)",
              }}
            >
              <div>
                <div style={{ fontSize: "var(--text-sm)", fontWeight: "bold", color: "var(--color-text-inverse)" }}>
                  Dernière mise à jour des taux
                </div>
                <div style={{ fontSize: "var(--text-xs)", color: "var(--color-neutral-400)", marginTop: "2px" }}>
                  {ratesLastUpdated
                    ? new Date(ratesLastUpdated).toLocaleString("fr-FR", {
                        dateStyle: "long",
                        timeStyle: "short",
                      })
                    : "Aucun taux enregistré (EUR parité fixe par défaut)"}
                </div>
              </div>

              <button
                type="button"
                className={styles.uploadBtn}
                onClick={handleRefreshRates}
                disabled={refreshingRates}
                style={{ cursor: refreshingRates ? "wait" : "pointer" }}
              >
                <RefreshCw size={14} />
                <span>{refreshingRates ? "Actualisation…" : "Actualiser les taux"}</span>
              </button>
            </div>

            {/* Liste des devises avec checkboxes */}
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Devises proposées aux clients</label>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                  gap: "var(--space-3)",
                  marginTop: "var(--space-2)",
                }}
              >
                {CURRENCY_OPTIONS.map((opt) => {
                  const isChecked = (
                    settings.enabled_currencies || ["XOF", "EUR", "USD"]
                  ).includes(opt.code);

                  return (
                    <label
                      key={opt.code}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "var(--space-3)",
                        padding: "var(--space-3)",
                        background: "var(--color-neutral-900)",
                        border: `1px solid ${isChecked ? "var(--color-brand)" : "var(--color-neutral-700)"}`,
                        borderRadius: "var(--radius)",
                        cursor: opt.locked ? "default" : "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={opt.locked}
                        onChange={() => toggleCurrency(opt.code)}
                        style={{ marginTop: "3px" }}
                      />
                      <div>
                        <div
                          style={{
                            fontSize: "var(--text-sm)",
                            fontWeight: "bold",
                            color: isChecked ? "var(--color-brand)" : "var(--color-text-inverse)",
                          }}
                        >
                          {opt.label}
                        </div>
                        <div style={{ fontSize: "var(--text-xs)", color: "var(--color-neutral-400)" }}>
                          {opt.note}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Save Bar */}
        <div className={styles.saveBar}>
          <span className={styles.saveBarText}>
            Toutes les modifications sont protégées par RLS et vérification <code>aal2</code>.
          </span>
          <button
            type="submit"
            className={styles.saveBtn}
            disabled={saving}
          >
            <Save size={16} />
            <span>{saving ? "Enregistrement…" : "Enregistrer les réglages"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
