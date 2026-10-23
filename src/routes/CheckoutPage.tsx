import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Truck,
  Banknote,
  AlertTriangle,
  Lock,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { supabase } from "@/lib/supabase";
import {
  Button,
  Input,
  Badge,
  Breadcrumb,
  EmptyState,
} from "@/components/ui";
import { SEO } from "@/components/SEO";
import styles from "./CheckoutPage.module.css";

function formatXOF(amount: number): string {
  return amount.toLocaleString("fr-FR") + "\u00a0XOF";
}

// Validation schéma en français
export const checkoutSchema = z.object({
  first_name: z
    .string()
    .trim()
    .min(1, "Le prénom est obligatoire.")
    .max(100, "Le prénom ne doit pas dépasser 100 caractères."),
  last_name: z
    .string()
    .trim()
    .min(1, "Le nom est obligatoire.")
    .max(100, "Le nom ne doit pas dépasser 100 caractères."),
  email: z
    .string()
    .trim()
    .min(1, "L'adresse e-mail est obligatoire.")
    .max(255, "L'adresse e-mail ne doit pas dépasser 255 caractères.")
    .email("Veuillez saisir une adresse e-mail valide."),
  phone: z
    .string()
    .trim()
    .min(1, "Le numéro de téléphone est obligatoire.")
    .max(30, "Le numéro de téléphone ne doit pas dépasser 30 caractères.")
    .refine(
      (val) => {
        const clean = val.replace(/[^0-9]/g, "");
        return clean.length >= 8 && clean.length <= 15;
      },
      { message: "Numéro de téléphone invalide (entre 8 et 15 chiffres requis)." }
    ),
  country: z
    .string()
    .trim()
    .min(1, "Le pays est obligatoire.")
    .max(100, "Le pays ne doit pas dépasser 100 caractères."),
  city: z
    .string()
    .trim()
    .min(1, "La ville est obligatoire.")
    .max(100, "La ville ne doit pas dépasser 100 caractères."),
  line1: z
    .string()
    .trim()
    .min(1, "L'adresse de livraison est obligatoire.")
    .max(255, "L'adresse ne doit pas dépasser 255 caractères."),
  notes: z
    .string()
    .max(1000, "Les indications ne doivent pas dépasser 1000 caractères.")
    .optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface ShippingRate {
  id: string;
  name: string;
  min_weight_g: number;
  max_weight_g: number | null;
  price: number;
  currency: string;
  is_active: boolean;
}

interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  regions: string[] | null;
  is_active: boolean;
  shipping_rates: ShippingRate[];
}

interface AppliedPromo {
  code: string;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  discount_amount: number;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, clearCart, updateQuantity, removeItem } = useCart();

  // Zones & tarifs de livraison actifs
  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(true);

  // Soumission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Code promo
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromo | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [loadingPromo, setLoadingPromo] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "+228 ",
      country: "Togo",
      city: "Lomé",
      line1: "",
      notes: "",
    },
  });

  const watchedCountry = watch("country");
  const watchedCity = watch("city");

  // 1. Préremplissage pour utilisateur connecté depuis profil et adresse
  useEffect(() => {
    let mounted = true;

    async function loadUserProfile() {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone, email")
          .eq("id", user.id)
          .maybeSingle();

        const { data: address } = await supabase
          .from("addresses")
          .select("*")
          .eq("user_id", user.id)
          .order("is_default", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!mounted) return;

        let firstName = "";
        let lastName = "";

        if (address?.first_name || address?.last_name) {
          firstName = address.first_name || "";
          lastName = address.last_name || "";
        } else if (profile?.full_name) {
          const parts = profile.full_name.trim().split(/\s+/);
          firstName = parts[0] || "";
          lastName = parts.slice(1).join(" ") || parts[0] || "";
        }

        reset({
          first_name: firstName,
          last_name: lastName,
          email: user.email || profile?.email || "",
          phone: address?.phone || profile?.phone || "+228 ",
          country: address?.country || "Togo",
          city: address?.city || "Lomé",
          line1: address?.line1 || "",
          notes: "",
        });
      } catch (err) {
        console.error("Erreur préremplissage profil", err);
      }
    }

    loadUserProfile();

    return () => {
      mounted = false;
    };
  }, [user, reset]);

  // 2. Chargement des zones et tarifs de livraison
  useEffect(() => {
    let mounted = true;

    async function loadShippingRates() {
      try {
        setLoadingShipping(true);
        const { data, error } = await supabase
          .from("shipping_zones")
          .select("id, name, countries, regions, is_active, shipping_rates(*)")
          .eq("is_active", true);

        if (error) throw error;
        if (mounted && data) {
          setShippingZones(data as ShippingZone[]);
        }
      } catch (err) {
        console.error("Erreur chargement tarifs livraison", err);
      } finally {
        if (mounted) setLoadingShipping(false);
      }
    }

    loadShippingRates();

    return () => {
      mounted = false;
    };
  }, []);

  // 3. Calcul dynamique des frais de livraison AVANT validation
  const matchedShipping = useMemo(() => {
    const country = (watchedCountry || "").trim().toLowerCase();
    const city = (watchedCity || "").trim().toLowerCase();

    if (!country) return null;

    // Trouver les zones qui couvrent le pays
    const eligibleZones = shippingZones.filter((zone) =>
      zone.countries.some((c) => c.trim().toLowerCase() === country)
    );

    if (eligibleZones.length === 0) return null;

    // Priorité 1 : zone avec région correspondant spécifiquement à la ville
    const specificZone = eligibleZones.find(
      (zone) =>
        zone.regions &&
        zone.regions.length > 0 &&
        zone.regions.some((r) => r.trim().toLowerCase() === city)
    );

    // Priorité 2 : zone sans restriction de région (couvre tout le pays)
    const generalZone = eligibleZones.find(
      (zone) => !zone.regions || zone.regions.length === 0
    );

    const targetZone = specificZone || generalZone;
    if (!targetZone) return null;

    // Trouver le tarif actif adapté
    const activeRates = (targetZone.shipping_rates || [])
      .filter((r) => r.is_active)
      .sort((a, b) => a.price - b.price);

    const rate = activeRates[0] || null;
    if (!rate) return null;

    return {
      zone: targetZone,
      rate,
      price: rate.price,
    };
  }, [shippingZones, watchedCountry, watchedCity]);

  const isShippingValid = matchedShipping !== null;
  const shippingFee = matchedShipping ? matchedShipping.price : null;

  // Recalcul du montant de remise si le sous-total change
  useEffect(() => {
    if (!appliedPromo) return;
    let disc = 0;
    if (appliedPromo.discount_type === "percentage") {
      disc = Math.round((subtotal * appliedPromo.discount_value) / 100);
      disc = Math.min(disc, subtotal);
    } else {
      disc = Math.min(appliedPromo.discount_value, subtotal);
    }
    setAppliedPromo((prev) => (prev ? { ...prev, discount_amount: disc } : null));
  }, [subtotal]);

  // 4. Application du code promotionnel
  const handleApplyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoInput.trim().toUpperCase();
    if (!code) return;

    setLoadingPromo(true);
    setPromoError(null);

    try {
      const { data: promo, error } = await supabase
        .from("promotions")
        .select("*")
        .ilike("code", code)
        .maybeSingle();

      if (error || !promo) {
        setPromoError("Ce code promotionnel est introuvable.");
        return;
      }

      if (!promo.is_active) {
        setPromoError("Ce code promotionnel n'est plus actif.");
        return;
      }

      const now = new Date();
      if (promo.starts_at && now < new Date(promo.starts_at)) {
        setPromoError("Ce code promo n'est pas encore actif.");
        return;
      }

      if (promo.ends_at && now > new Date(promo.ends_at)) {
        setPromoError("Ce code promotionnel a expiré.");
        return;
      }

      if (promo.max_uses != null && promo.used_count >= promo.max_uses) {
        setPromoError("Ce code promotionnel a atteint sa limite d'utilisation.");
        return;
      }

      if (promo.min_order_amount != null && subtotal < promo.min_order_amount) {
        setPromoError(
          `Montant minimum de ${formatXOF(promo.min_order_amount)} requis pour ce code.`
        );
        return;
      }

      let discountAmount = 0;
      if (promo.discount_type === "percentage") {
        discountAmount = Math.round((subtotal * promo.discount_value) / 100);
        discountAmount = Math.min(discountAmount, subtotal);
      } else {
        discountAmount = Math.min(promo.discount_value, subtotal);
      }

      setAppliedPromo({
        code: promo.code,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        discount_amount: discountAmount,
      });
      setPromoInput("");
    } catch {
      setPromoError("Impossible de vérifier le code promo.");
    } finally {
      setLoadingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError(null);
  };

  // Calculs totaux
  const discountTotal = appliedPromo ? appliedPromo.discount_amount : 0;
  const calculatedTotal =
    shippingFee !== null ? Math.max(0, subtotal - discountTotal + shippingFee) : null;

  // 5. Validation et soumission de la commande
  const onSubmit = async (data: CheckoutFormData) => {
    if (!isShippingValid || shippingFee === null) {
      setSubmitError(
        "Livraison non disponible pour cette destination. Impossible de valider la commande."
      );
      return;
    }

    if (items.length === 0) {
      setSubmitError("Votre panier est vide.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const pItems = items.map((i) => ({
      variant_id: i.variant_id,
      quantity: i.quantity,
    }));

    const pCustomer = {
      first_name: data.first_name.trim(),
      last_name: data.last_name.trim(),
      email: data.email.trim().toLowerCase(),
      phone: data.phone.trim(),
      notes: data.notes?.trim() || null,
    };

    const pShipping = {
      line1: data.line1.trim(),
      city: data.city.trim(),
      country: data.country.trim(),
      notes: data.notes?.trim() || null,
    };

    try {
      const { data: orderResult, error: rpcError } = await supabase.rpc(
        "place_order",
        {
          p_items: pItems,
          p_customer: pCustomer,
          p_shipping_address: pShipping,
          p_payment_method: "cash_on_delivery",
          p_promo_code: appliedPromo?.code || null,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      // Vidage du panier UNIQUEMENT en cas de succès confirmé
      await clearCart();

      // Redirection vers confirmation avec données réelles
      navigate("/commande/confirmation", {
        state: {
          orderId: orderResult.order_id,
          orderNumber: orderResult.order_number,
          subtotal: orderResult.subtotal,
          shippingTotal: orderResult.shipping_total,
          discountTotal: orderResult.discount_total,
          total: orderResult.total,
          currency: orderResult.currency || "XOF",
          guestToken: orderResult.guest_token,
          customer: pCustomer,
          shippingAddress: pShipping,
          items: [...items],
        },
        replace: true,
      });
    } catch (err: unknown) {
      const rawMsg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "Une erreur est survenue lors de la création de la commande.";

      // Gestion spécifique des erreurs de stock : réajustement du panier
      const isStockOrArchived =
        rawMsg.toLowerCase().includes("stock") ||
        rawMsg.toLowerCase().includes("archive") ||
        rawMsg.toLowerCase().includes("disponible");

      if (isStockOrArchived) {
        try {
          const variantIds = items.map((i) => i.variant_id);
          const { data: freshVariants } = await supabase
            .from("product_variants")
            .select("id, stock, products(name, is_archived)")
            .in("id", variantIds);

          const explanations: string[] = [];

          if (freshVariants) {
            for (const item of items) {
              const fresh = freshVariants.find((v: { id: string }) => v.id === item.variant_id);
              const isArchived = (fresh as { products?: { is_archived?: boolean } })?.products?.is_archived;
              const currentStock = fresh?.stock ?? 0;

              if (!fresh || isArchived || currentStock <= 0) {
                await removeItem(item.id);
                explanations.push(
                  `« ${item.product_name} » n'est plus disponible et a été retiré de votre panier.`
                );
              } else if (currentStock < item.quantity) {
                await updateQuantity(item.id, currentStock);
                explanations.push(
                  `La quantité de « ${item.product_name} » a été ajustée à ${currentStock} (stock disponible restant).`
                );
              }
            }
          }

          setSubmitError(
            explanations.length > 0
              ? `Ajustement de stock nécessaire : ${explanations.join(" ")} Veuillez vérifier votre commande avant de revalider.`
              : rawMsg
          );
        } catch {
          setSubmitError(rawMsg);
        }
      } else {
        setSubmitError(rawMsg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Si le panier est vide
  if (items.length === 0) {
    return (
      <main className={styles.page}>
        <SEO
          title="Commander"
          description="Votre panier est actuellement vide. Découvrez notre collection de streetwear contemporain."
        />
        <div className={styles.container}>
          <div className={styles.breadcrumbNav}>
            <Breadcrumb
              items={[
                { label: "Accueil", href: "/" },
                { label: "Panier", href: "/panier" },
                { label: "Commande" },
              ]}
            />
          </div>
          <EmptyState
            icon={<ShoppingBag size={56} strokeWidth={1} />}
            title="Votre panier est vide"
            description="Ajoutez des articles à votre panier pour passer commande."
            action={
              <Link to="/boutique" style={{ textDecoration: "none" }}>
                <Button variant="primary" size="lg">
                  Voir la boutique
                </Button>
              </Link>
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <SEO
        title="Finaliser la commande"
        description="Renseignez vos coordonnées et choisissez votre mode de paiement pour valider votre commande sur JACOB DE JESUS."
      />
      <div className={styles.container}>
        <div className={styles.breadcrumbNav}>
          <Breadcrumb
            items={[
              { label: "Accueil", href: "/" },
              { label: "Panier", href: "/panier" },
              { label: "Commande" },
            ]}
          />
        </div>

        <header className={styles.pageHeader}>
          <h1 className={styles.title}>Finaliser la commande</h1>
          <div className={styles.authBadge}>
            <span className={styles.authBadgeDot} />
            {user ? (
              <span>
                Connecté en tant que <strong>{user.email}</strong> (préremplissage actif)
              </span>
            ) : (
              <span>
                Commande invité · Aucun compte requis ·{" "}
                <Link to="/connexion?redirect=/commande" style={{ color: "inherit", fontWeight: 700 }}>
                  Se connecter ?
                </Link>
              </span>
            )}
          </div>
        </header>

        {submitError && (
          <div className={styles.errorBanner} role="alert">
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <div className={styles.errorBannerContent}>
              <div className={styles.errorBannerTitle}>Impossible de valider la commande</div>
              <div>{submitError}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.grid}>
            {/* Colonne gauche : formulaires */}
            <div className={styles.formCol}>
              {/* Étape 1 : Coordonnées client */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    1. Coordonnées du destinataire
                  </h2>
                  <span className={styles.cardStep}>Informations client</span>
                </div>

                <div className={styles.row2}>
                  <div className={styles.fieldGroup}>
                    <Input
                      label="Prénom *"
                      placeholder="Ex: Koffi"
                      error={errors.first_name?.message}
                      {...register("first_name")}
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <Input
                      label="Nom *"
                      placeholder="Ex: Mensah"
                      error={errors.last_name?.message}
                      {...register("last_name")}
                    />
                  </div>
                </div>

                <div className={styles.row2}>
                  <div className={styles.fieldGroup}>
                    <Input
                      label="Téléphone *"
                      type="tel"
                      placeholder="+228 90 12 34 56"
                      hint="Pour être joint par le livreur"
                      error={errors.phone?.message}
                      {...register("phone")}
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <Input
                      label="Adresse e-mail *"
                      type="email"
                      placeholder="exemple@domaine.com"
                      hint="Pour la confirmation et le suivi"
                      error={errors.email?.message}
                      {...register("email")}
                    />
                  </div>
                </div>
              </section>

              {/* Étape 2 : Adresse de livraison */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    2. Adresse de livraison
                  </h2>
                  <span className={styles.cardStep}>Destination</span>
                </div>

                <div className={styles.row2}>
                  <div className={styles.fieldGroup}>
                    <Input
                      label="Pays *"
                      placeholder="Ex: Togo"
                      error={errors.country?.message}
                      {...register("country")}
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <Input
                      label="Ville *"
                      placeholder="Ex: Lomé"
                      error={errors.city?.message}
                      {...register("city")}
                    />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <Input
                    label="Adresse complète (rue, quartier, numéro) *"
                    placeholder="Ex: Quartier Tokoin, Rue des Palmiers, Porte 42"
                    error={errors.line1?.message}
                    {...register("line1")}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <div className={styles.textareaWrapper}>
                    <label htmlFor="notes" className={styles.label}>
                      Indications pour le livreur (facultatif)
                    </label>
                    <textarea
                      id="notes"
                      className={styles.textarea}
                      placeholder="Ex: Maison blanche portail noir en face de la pharmacie, appeler avant d'arriver..."
                      {...register("notes")}
                    />
                    <span className={styles.hint}>
                      Aidez le livreur à vous trouver plus rapidement.
                    </span>
                  </div>
                </div>
              </section>

              {/* Étape 3 : Frais de livraison (calculés dynamiquement AVANT validation) */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    3. Mode de livraison
                  </h2>
                  <span className={styles.cardStep}>Tarif calculé</span>
                </div>

                {loadingShipping ? (
                  <p className={styles.hint}>Calcul des frais de livraison en cours…</p>
                ) : isShippingValid && matchedShipping ? (
                  <div className={styles.shippingCard}>
                    <Truck size={24} className={styles.shippingIcon} />
                    <div className={styles.shippingInfo}>
                      <div className={styles.shippingTitle}>
                        {matchedShipping.rate.name}
                      </div>
                      <div className={styles.shippingDesc}>
                        Destination reconnue pour {watchedCity}, {watchedCountry} ({matchedShipping.zone.name}).
                        Livraison en main propre à votre domicile.
                      </div>
                    </div>
                    <div className={styles.shippingPrice}>
                      {matchedShipping.price === 0
                        ? "Gratuit"
                        : formatXOF(matchedShipping.price)}
                    </div>
                  </div>
                ) : (
                  <div className={styles.shippingWarning}>
                    <AlertTriangle size={24} style={{ flexShrink: 0 }} />
                    <div>
                      <div className={styles.shippingWarningTitle}>
                        Livraison à confirmer
                      </div>
                      <div className={styles.shippingWarningText}>
                        Aucun tarif de livraison automatique n'est configuré pour la destination{" "}
                        <strong>{watchedCity || "non renseignée"}, {watchedCountry || "non renseigné"}</strong>.
                        La validation de la commande en ligne est actuellement bloquée pour cette adresse.
                        Veuillez corriger votre ville ou pays pour sélectionner une zone desservie (ex: Lomé, Togo).
                      </div>
                    </div>
                  </div>
                )}
              </section>

              {/* Étape 4 : Mode de paiement */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    4. Mode de paiement
                  </h2>
                  <span className={styles.cardStep}>Unique méthode active</span>
                </div>

                <div className={styles.paymentCard}>
                  <Banknote size={26} className={styles.paymentIcon} />
                  <div className={styles.paymentInfo}>
                    <div className={styles.paymentTitleRow}>
                      <span className={styles.paymentTitle}>
                        Paiement à la livraison (Cash on Delivery)
                      </span>
                      <Badge variant="neutral">Actif</Badge>
                    </div>
                    <p className={styles.paymentDesc}>
                      Réglez en espèces directement auprès du livreur lors de la remise en main propre de votre colis.
                      Aucun débit en ligne n'est effectué aujourd'hui. Prévoyez l'appoint si possible.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* Colonne droite : Récapitulatif complet */}
            <aside className={styles.summaryCol}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryHeader}>
                  <h2 className={styles.summaryTitle}>Récapitulatif</h2>
                  <span className={styles.hint}>{items.length} article(s)</span>
                </div>

                {/* Liste des articles */}
                <ul className={styles.itemsList}>
                  {items.map((item) => (
                    <li key={item.id} className={styles.itemRow}>
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.product_name}
                          className={styles.itemThumb}
                        />
                      ) : (
                        <div className={styles.itemThumb} />
                      )}
                      <div className={styles.itemInfo}>
                        <div className={styles.itemName} title={item.product_name}>
                          {item.product_name}
                        </div>
                        <div className={styles.itemMeta}>
                          {item.size && <span>Taille : {item.size}</span>}
                          {item.color && <span>· {item.color}</span>}
                          <span>· Qté : {item.quantity}</span>
                        </div>
                      </div>
                      <div className={styles.itemPrice}>
                        {formatXOF(item.unit_price * item.quantity)}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Section Code Promo */}
                <div className={styles.promoSection}>
                  {appliedPromo ? (
                    <div className={styles.promoApplied}>
                      <div>
                        <span className={styles.promoTag}>✓ {appliedPromo.code}</span>
                        <span style={{ marginLeft: 6, color: "var(--color-neutral-600)" }}>
                          (-{formatXOF(appliedPromo.discount_amount)})
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemovePromo}
                        className={styles.promoRemoveBtn}
                      >
                        Retirer
                      </button>
                    </div>
                  ) : (
                    <div className={styles.promoForm}>
                      <input
                        type="text"
                        placeholder="Code promo"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        className={styles.textarea}
                        style={{ minHeight: "auto", height: 38, padding: "0 10px" }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!promoInput.trim() || loadingPromo}
                        onClick={handleApplyPromo}
                      >
                        {loadingPromo ? "…" : "Appliquer"}
                      </Button>
                    </div>
                  )}
                  {promoError && <p className={styles.promoError}>{promoError}</p>}
                </div>

                {/* Totaux */}
                <div className={styles.totalsBreakdown}>
                  <div className={styles.calcRow}>
                    <span>Sous-total articles</span>
                    <span className={styles.calcValue}>{formatXOF(subtotal)}</span>
                  </div>

                  <div className={styles.calcRow}>
                    <span>Frais de livraison</span>
                    {isShippingValid && shippingFee !== null ? (
                      <span className={styles.calcValue}>
                        {shippingFee === 0 ? "Gratuit" : formatXOF(shippingFee)}
                      </span>
                    ) : (
                      <span className={styles.unconfirmedText}>
                        Livraison à confirmer
                      </span>
                    )}
                  </div>

                  {appliedPromo && (
                    <div className={styles.calcRow}>
                      <span>Remise promo ({appliedPromo.code})</span>
                      <span className={styles.discountValue}>
                        -{formatXOF(appliedPromo.discount_amount)}
                      </span>
                    </div>
                  )}

                  <div className={styles.divider} />

                  <div className={styles.totalRow}>
                    <span className={styles.totalLabel}>Total à payer</span>
                    <span className={styles.totalAmount}>
                      {calculatedTotal !== null
                        ? formatXOF(calculatedTotal)
                        : formatXOF(subtotal)}
                    </span>
                  </div>
                </div>

                {/* Bouton de confirmation */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className={styles.submitBtn}
                  disabled={isSubmitting || !isShippingValid || items.length === 0}
                  isLoading={isSubmitting}
                >
                  {isSubmitting
                    ? "Confirmation en cours…"
                    : !isShippingValid
                    ? "Livraison indisponible"
                    : "Confirmer la commande"}
                </Button>

                <div className={styles.guarantees}>
                  <div className={styles.guaranteeItem}>
                    <Lock size={14} />
                    <span>Paiement en espèces lors de la livraison</span>
                  </div>
                  <div className={styles.guaranteeItem}>
                    <ShieldCheck size={14} />
                    <span>Vérification des articles avant règlement</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </form>
      </div>
    </main>
  );
}
