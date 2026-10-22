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
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { resizeImageToMax1600 } from "@/lib/admin-utils";
import { useToast } from "@/components/ui/Toast";
import styles from "./AdminSettingsPage.module.css";

interface StoreSettingsData {
  id?: string;
  store_name: string;
  tagline: string;
  description: string;
  logo_url: string;
  banner_url: string;
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
}

const DEFAULT_SETTINGS: StoreSettingsData = {
  store_name: "JACOB DE JESUS",
  tagline: "Streetwear brutal, épuré, intemporel.",
  description: "Boutique officielle de la maison JACOB DE JESUS.",
  logo_url: "",
  banner_url: "",
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
};

export default function AdminSettingsPage() {
  const { showToast } = useToast();
  const [settings, setSettings] = useState<StoreSettingsData>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

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
            cgv: data.cgv || "",
            privacy_policy: data.privacy_policy || "",
            legal_mentions: data.legal_mentions || "",
            returns_policy: data.returns_policy || "",
            social_links: data.social_links && typeof data.social_links === "object"
              ? data.social_links
              : {},
          });
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

  const handleUploadImage = async (
    file: File,
    type: "logo" | "banner"
  ) => {
    try {
      if (type === "logo") setUploadingLogo(true);
      else setUploadingBanner(true);
      setError(null);

      // Redimensionnement max 1600px et vérification type/taille
      const resizedBlob = await resizeImageToMax1600(file);

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
      } else {
        setSettings((prev) => ({ ...prev, banner_url: publicUrl }));
      }

      showToast(
        type === "logo" ? "Logo mis à jour !" : "Bannière mise à jour !",
        "success"
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors du téléversement.";
      setError(msg);
      showToast(msg, "error");
    } finally {
      if (type === "logo") setUploadingLogo(false);
      else setUploadingBanner(false);
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
        cgv: settings.cgv.trim() || null,
        privacy_policy: settings.privacy_policy.trim() || null,
        legal_mentions: settings.legal_mentions.trim() || null,
        returns_policy: settings.returns_policy.trim() || null,
        social_links: settings.social_links || {},
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
                      onClick={() => handleChange("banner_url", "")}
                    >
                      <Trash2 size={13} />
                      <span>Retirer</span>
                    </button>
                  )}
                </div>
                <span className={styles.fieldHelp}>
                  Photo plein écran d'ambiance pour la page d'accueil (max 1600px).
                </span>
              </div>
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
