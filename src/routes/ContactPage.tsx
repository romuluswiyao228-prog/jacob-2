import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Phone,
  Mail,
  MessageCircle,
  MapPin,
  Clock,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useStoreSettings } from "@/lib/hooks";
import {
  AuthForm,
  AuthField,
  AuthSubmit,
  AuthAlert,
} from "@/components/auth";
import { Breadcrumb } from "@/components/ui";
import { SEO } from "@/components/SEO";
import styles from "./ContactPage.module.css";

export default function ContactPage() {
  const [searchParams] = useSearchParams();
  const { data: settings } = useStoreSettings();

  // Form State
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subject, setSubject] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [message, setMessage] = useState("");

  // Honeypot & Anti-spam timing
  const [honeypot, setHoneypot] = useState("");
  const mountTimeRef = useRef<number>(Date.now());

  // Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Pre-fill order number from query param ?commande= or ?order=
  useEffect(() => {
    const param = searchParams.get("commande") || searchParams.get("order");
    if (param) {
      setOrderNumber(param.trim());
      if (!subject) {
        setSubject(`Question sur ma commande ${param.trim()}`);
      }
    }
  }, [searchParams, subject]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // 1. Check honeypot (champ piège invisible)
    if (honeypot.trim().length > 0) {
      // Robot detected -> silent reject without inserting
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setIsSuccess(true);
      }, 1000);
      return;
    }

    // 2. Délai minimum anti-bot (au moins 3 secondes sur la page)
    const elapsedSeconds = (Date.now() - mountTimeRef.current) / 1000;
    if (elapsedSeconds < 3) {
      setError("Veuillez patienter quelques instants avant de soumettre le formulaire.");
      return;
    }

    // 3. Validation des longueurs
    const cleanName = name.trim();
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    if (cleanName.length > 100) {
      setError("Le nom ne peut pas dépasser 100 caractères.");
      return;
    }
    if (cleanSubject.length > 150) {
      setError("Le sujet ne peut pas dépasser 150 caractères.");
      return;
    }
    if (cleanMessage.length > 2000) {
      setError("Le message ne peut pas dépasser 2000 caractères.");
      return;
    }

    try {
      setIsSubmitting(true);

      // Concaténer téléphone et numéro de commande dans le message
      const formattedMessage = [
        phone.trim() ? `Téléphone : ${phone.trim()}` : null,
        orderNumber.trim() ? `Numéro de commande : ${orderNumber.trim()}` : null,
        cleanMessage,
      ]
        .filter(Boolean)
        .join("\n\n");

      const finalSubject = orderNumber.trim()
        ? `[${orderNumber.trim()}] ${cleanSubject}`
        : cleanSubject;

      // Enregistrement réel dans la table contact_messages
      const { error: insertErr } = await supabase
        .from("contact_messages")
        .insert({
          name: cleanName,
          email: email.trim(),
          subject: finalSubject.slice(0, 150),
          message: formattedMessage.slice(0, 2000),
        });

      if (insertErr) {
        throw insertErr;
      }

      // Confirmation SEULEMENT après insertion réussie
      setIsSuccess(true);
    } catch (err: unknown) {
      console.error("Erreur enregistrement contact", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Une erreur est survenue lors de l'envoi de votre message. Veuillez réessayer.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setName("");
    setEmail("");
    setPhone("");
    setSubject("");
    setOrderNumber("");
    setMessage("");
    setError(null);
    setIsSuccess(false);
    mountTimeRef.current = Date.now();
  };

  // Coordonnées renseignées dans public_store_settings
  const whatsappNumber = settings?.whatsapp_number?.trim();
  const phoneContact = settings?.phone?.trim();
  const emailContact = settings?.email?.trim();
  const fullAddress = [settings?.address, settings?.city, settings?.country]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
  const openingHours = settings?.opening_hours?.trim();

  const socialLinks = Object.entries(settings?.social_links || {}).filter(
    ([, url]) => url && typeof url === "string" && url.trim().length > 0
  );

  return (
    <div className={styles.page}>
      <SEO
        title="Contact"
        description="Une question sur une pièce, une commande ou un drop ? Contactez le service client JACOB DE JESUS."
      />
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/" },
          { label: "Contact" },
        ]}
        style={{ marginBottom: "var(--space-4)" }}
      />
      <header className={styles.header}>
        <h1 className={styles.title}>Contactez-nous</h1>
        <p className={styles.subtitle}>
          Une question sur une pièce, une commande ou un drop ? Notre équipe vous répond avec soin et rapidité.
        </p>
      </header>

      <div className={styles.layout}>
        {/* Colonne 1 : Coordonnées réelles depuis public_store_settings */}
        <aside className={styles.infoColumn}>
          <div className={styles.infoCard}>
            <h2 className={styles.infoHeading}>Nos Canaux</h2>

            <div className={styles.channelsList}>
              {/* WhatsApp direct */}
              {whatsappNumber && (
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.channelItem}
                >
                  <div className={styles.channelIconWrap}>
                    <MessageCircle size={20} />
                  </div>
                  <div className={styles.channelContent}>
                    <span className={styles.channelLabel}>WhatsApp officiel</span>
                    <span className={styles.channelValue}>Discuter en direct</span>
                  </div>
                </a>
              )}

              {/* Appel téléphonique */}
              {phoneContact && (
                <a href={`tel:${phoneContact}`} className={styles.channelItem}>
                  <div className={styles.channelIconWrap}>
                    <Phone size={20} />
                  </div>
                  <div className={styles.channelContent}>
                    <span className={styles.channelLabel}>Service client</span>
                    <span className={styles.channelValue}>{phoneContact}</span>
                  </div>
                </a>
              )}

              {/* E-mail officiel */}
              {emailContact && (
                <a href={`mailto:${emailContact}`} className={styles.channelItem}>
                  <div className={styles.channelIconWrap}>
                    <Mail size={20} />
                  </div>
                  <div className={styles.channelContent}>
                    <span className={styles.channelLabel}>E-mail</span>
                    <span className={styles.channelValue}>{emailContact}</span>
                  </div>
                </a>
              )}

              {/* Adresse physique */}
              {fullAddress && (
                <div className={styles.channelItem}>
                  <div className={styles.channelIconWrap}>
                    <MapPin size={20} />
                  </div>
                  <div className={styles.channelContent}>
                    <span className={styles.channelLabel}>Boutique physique</span>
                    <span className={styles.channelValue}>{fullAddress}</span>
                  </div>
                </div>
              )}

              {/* Horaires d'ouverture */}
              {openingHours && (
                <div className={styles.channelItem}>
                  <div className={styles.channelIconWrap}>
                    <Clock size={20} />
                  </div>
                  <div className={styles.channelContent}>
                    <span className={styles.channelLabel}>Horaires d'accueil</span>
                    <span
                      className={styles.channelValue}
                      style={{ whiteSpace: "pre-line", fontWeight: "normal", fontSize: "0.85rem" }}
                    >
                      {openingHours}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Réseaux sociaux renseignés */}
            {socialLinks.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <span className={styles.channelLabel}>Suivez la maison</span>
                <div className={styles.socialsGroup}>
                  {socialLinks.map(([platform, url]) => (
                    <a
                      key={platform}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.socialBtn}
                    >
                      <Share2 size={12} />
                      <span>{platform}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Colonne 2 : Formulaire de contact */}
        <div className={styles.formColumn}>
          <div className={styles.formCard}>
            {isSuccess ? (
              <div className={styles.successCard}>
                <div className={styles.successIcon}>
                  <CheckCircle2 size={32} />
                </div>
                <h2 className={styles.successTitle}>Message envoyé</h2>
                <p className={styles.successDesc}>
                  Votre demande a bien été enregistrée par notre équipe. Nous vous répondrons par e-mail dans les plus brefs délais.
                </p>
                <button
                  type="button"
                  className={styles.resetBtn}
                  onClick={handleReset}
                >
                  Envoyer un autre message
                </button>
              </div>
            ) : (
              <AuthForm onSubmit={handleSubmit} noValidate>
                {error && <AuthAlert tone="error">{error}</AuthAlert>}

                {/* Champ piège invisible (Honeypot) */}
                <input
                  type="text"
                  name="_honey_trap"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{
                    display: "none",
                    position: "absolute",
                    opacity: 0,
                    pointerEvents: "none",
                  }}
                />

                <AuthField
                  label="Nom complet *"
                  type="text"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ex: Kofi Mensah"
                  autoComplete="name"
                />

                <AuthField
                  label="Adresse e-mail *"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nom@exemple.com"
                  autoComplete="email"
                />

                <AuthField
                  label="Numéro de téléphone (facultatif)"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="ex: +228 90 00 00 00"
                  autoComplete="tel"
                />

                <AuthField
                  label="Numéro de commande (facultatif)"
                  type="text"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="ex: JDJ-2026-000123"
                  hint="Si votre demande concerne une commande existante."
                />

                <AuthField
                  label="Objet de votre demande *"
                  type="text"
                  required
                  maxLength={150}
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="ex: Question sur les tailles / Suivi d'expédition"
                />

                <div className={styles.fieldWrapper}>
                  <label htmlFor="contact_message" className={styles.fieldLabel}>
                    <span>Message *</span>
                    <span className={styles.charCount}>{message.length} / 2000</span>
                  </label>
                  <textarea
                    id="contact_message"
                    required
                    maxLength={2000}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className={styles.textarea}
                    placeholder="Écrivez votre message avec le plus de précisions possible..."
                  />
                </div>

                <AuthSubmit
                  loading={isSubmitting}
                  loadingLabel="Envoi en cours…"
                >
                  Envoyer le message
                </AuthSubmit>
              </AuthForm>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
