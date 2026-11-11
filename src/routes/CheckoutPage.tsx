import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  MapPin,
  Navigation,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";
import { useCurrency } from "@/lib/currency-context";
import { supabase } from "@/lib/supabase";
import {
  Button,
  Input,
  Breadcrumb,
  EmptyState,
} from "@/components/ui";
import { SEO } from "@/components/SEO";
import {
  collectCheckoutCities,
  collectCheckoutCountries,
  shouldShowCountrySelector,
  defaultCheckoutCity,
  hasDeliveryPosition,
  mapsLinkError,
  matchShippingFee,
  googleMapsCoordsUrl,
  type CheckoutZone,
} from "@/lib/checkout-utils";
import styles from "./CheckoutPage.module.css";

function formatXOF(amount: number): string {
  return amount.toLocaleString("fr-FR") + " XOF";
}

// Validation Zod — miroir des regles de public.place_order
export const checkoutSchema = z
  .object({
    first_name: z
      .string()
      .trim()
      .min(1, "Le prénom est obligatoire.")
      .max(100, "Le prénom ne doit pas dépasser 100 caractères."),
    full_name: z
      .string()
      .trim()
      .min(2, "Le nom complet est obligatoire (2 caractères minimum).")
      .max(100, "Le nom complet ne doit pas dépasser 100 caractères."),
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
    city: z
      .string()
      .trim()
      .min(1, "La ville est obligatoire.")
      .max(100, "La ville ne doit pas dépasser 100 caractères."),
    country: z
      .string()
      .trim()
      .max(100, "Le pays ne doit pas dépasser 100 caractères.")
      .optional(),
    lat: z.number().nullable().optional(),
    lng: z.number().nullable().optional(),
    maps_link: z
      .string()
      .trim()
      .max(300, "Le lien de position ne doit pas dépasser 300 caractères.")
      .optional()
      .or(z.literal("")),
    landmark: z
      .string()
      .trim()
      .max(200, "Le point de repère ne doit pas dépasser 200 caractères.")
      .refine(
        (val) => !/[\x00-\x1F\x7F]/.test(val),
        { message: "Le point de repère contient des caractères invalides." }
      )
      .optional()
      .or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const lat = data.lat ?? null;
    const lng = data.lng ?? null;
    if ((lat == null) !== (lng == null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lat"],
        message: "La latitude et la longitude doivent être fournies ensemble.",
      });
    }
    if (lat != null && (lat < -90 || lat > 90)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lat"],
        message: "La latitude doit être comprise entre -90 et 90.",
      });
    }
    if (lng != null && (lng < -180 || lng > 180)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["lng"],
        message: "La longitude doit être comprise entre -180 et 180.",
      });
    }
    const link = (data.maps_link ?? "").trim();
    if (link) {
      const err = mapsLinkError(link);
      if (err) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["maps_link"],
          message: err,
        });
      }
    }
    const landmark = (data.landmark ?? "").trim();
    if (!hasDeliveryPosition({ lat, lng, mapsLink: link, landmark })) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["landmark"],
        message: "Indiquez votre position ou un point de repère.",
      });
    }
  });

type CheckoutFormData = z.infer<typeof checkoutSchema>;

interface ShippingRate {
  id: string;
  name: string;
  price: number;
  currency: string;
  is_active: boolean;
}

interface ShippingZone extends CheckoutZone {
  id: string;
  shipping_rates: ShippingRate[];
}

type GeoState =
  | { status: "idle" }
  | { status: "locating" }
  | { status: "saved"; lat: number; lng: number }
  | { status: "error"; message: string };

export default function CheckoutPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const { currency, formatPrice } = useCurrency();

  const [shippingZones, setShippingZones] = useState<ShippingZone[]>([]);
  const [loadingShipping, setLoadingShipping] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [geo, setGeo] = useState<GeoState>({ status: "idle" });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      first_name: "",
      full_name: "",
      phone: "+228 ",
      city: "",
      country: "",
      lat: null,
      lng: null,
      maps_link: "",
      landmark: "",
    },
  });

  const watchedCity = watch("city");
  const watchedCountry = watch("country");

  const cities = useMemo(() => collectCheckoutCities(shippingZones), [shippingZones]);
  const countries = useMemo(() => collectCheckoutCountries(shippingZones), [shippingZones]);
  const showCountry = useMemo(() => shouldShowCountrySelector(shippingZones), [shippingZones]);
  const effectiveCountry = showCountry
    ? (watchedCountry ?? "")
    : (countries[0] ?? "Togo");

  // Zones + tarifs de livraison actifs
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoadingShipping(true);
        const { data, error } = await supabase
          .from("shipping_zones")
          .select("id, name, countries, regions, is_active, shipping_rates(*)")
          .eq("is_active", true);
        if (error) throw error;
        if (mounted && data) setShippingZones(data as ShippingZone[]);
      } catch (err) {
        console.error("Erreur chargement tarifs livraison", err);
      } finally {
        if (mounted) setLoadingShipping(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Préremplissage client connecté + ville par défaut
  useEffect(() => {
    if (loadingShipping) return;
    const defaultCity = defaultCheckoutCity(shippingZones);
    const defaultCountry = countries[0] ?? "Togo";

    let mounted = true;
    (async () => {
      let fullName = "";
      let phone = "+228 ";
      if (user) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("id", user.id)
            .maybeSingle();
          if (profile?.full_name) fullName = profile.full_name;
          if (profile?.phone) phone = profile.phone;
        } catch {
          // Préremplissage non critique
        }
      }
      const { data: address } = user
        ? await supabase
            .from("addresses")
            .select("city, country, phone")
            .eq("user_id", user.id)
            .order("is_default", { ascending: false })
            .limit(1)
            .maybeSingle()
        : { data: null };
      if (!mounted) return;

      reset({
        first_name: "",
        full_name: fullName,
        phone: address?.phone || phone,
        city: address?.city || defaultCity,
        country: showCountry ? address?.country || defaultCountry : "",
        lat: null,
        lng: null,
        maps_link: "",
        landmark: "",
      });
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingShipping, shippingZones, user]);

  // Frais de livraison dès le choix de la ville
  const matchedShipping = useMemo(
    () => matchShippingFee(shippingZones, effectiveCountry, watchedCity ?? ""),
    [shippingZones, effectiveCountry, watchedCity]
  );
  const isShippingValid = matchedShipping !== null;
  const shippingFee = matchedShipping?.price ?? null;

  const calculatedTotal =
    shippingFee !== null ? Math.max(0, subtotal + shippingFee) : null;

  const geoMapsUrl =
    geo.status === "saved"
      ? googleMapsCoordsUrl(geo.lat, geo.lng)
      : null;

  const requestPosition = () => {
    if (!("geolocation" in navigator)) {
      setGeo({
        status: "error",
        message: t("checkout.geoUnavailable", "La géolocalisation n'est pas disponible sur cet appareil."),
      });
      return;
    }
    setGeo({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setValue("lat", latitude, { shouldValidate: true });
        setValue("lng", longitude, { shouldValidate: true });
        setGeo({ status: "saved", lat: latitude, lng: longitude });
      },
      (err) => {
        const denied = err.code === err.PERMISSION_DENIED;
        setGeo({
          status: "error",
          message: denied
            ? t("checkout.geoDenied", "Position refusée. Vous pouvez coller un lien Google Maps ou indiquer un point de repère.")
            : t("checkout.geoError", "Impossible d'obtenir votre position. Vérifiez que la géolocalisation est activée."),
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

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
      full_name: data.full_name.trim(),
      phone: data.phone.trim(),
    };

    const pShippingAddress: Record<string, unknown> = {
      city: data.city.trim(),
      country: effectiveCountry || "Togo",
    };
    const lat = data.lat ?? null;
    const lng = data.lng ?? null;
    if (lat != null && lng != null) {
      pShippingAddress.lat = lat;
      pShippingAddress.lng = lng;
    }
    const link = (data.maps_link ?? "").trim();
    if (link) pShippingAddress.maps_link = link;
    const landmark = (data.landmark ?? "").trim();
    if (landmark) pShippingAddress.landmark = landmark;

    try {
      const { data: orderResult, error: rpcError } = await supabase.rpc(
        "place_order",
        {
          p_items: pItems,
          p_customer: pCustomer,
          p_shipping_address: pShippingAddress,
          p_payment_method: "cash_on_delivery",
          p_promo_code: null,
        }
      );

      if (rpcError) throw rpcError;

      await clearCart();

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
          shippingAddress: pShippingAddress,
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
      setSubmitError(rawMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <main className={styles.page}>
        <SEO
          title={t("checkout.pageTitle")}
          description="Votre panier est actuellement vide. Découvrez notre collection de streetwear contemporain."
        />
        <div className={styles.container}>
          <div className={styles.breadcrumbNav}>
            <Breadcrumb
              items={[
                { label: t("common.home"), href: "/" },
                { label: t("cart.pageTitle"), href: "/panier" },
                { label: t("checkout.pageTitle") },
              ]}
            />
          </div>
          <EmptyState
            icon={<ShoppingBag size={56} strokeWidth={1} />}
            title={t("cart.emptyTitle")}
            description={t("cart.emptyDesc")}
            action={
              <Link to="/boutique" style={{ textDecoration: "none" }}>
                <Button variant="primary" size="lg">
                  {t("cart.goToShop")}
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
        title={t("checkout.pageTitle")}
        description="Renseignez vos coordonnées et votre position pour valider votre commande sur JACOB DE JESUS."
      />
      <div className={styles.container}>
        <div className={styles.breadcrumbNav}>
          <Breadcrumb
            items={[
              { label: t("common.home"), href: "/" },
              { label: t("cart.pageTitle"), href: "/panier" },
              { label: t("checkout.pageTitle") },
            ]}
          />
        </div>

        <header className={styles.pageHeader}>
          <h1 className={styles.title}>{t("checkout.pageTitle")}</h1>
          <div className={styles.authBadge}>
            <span className={styles.authBadgeDot} />
            {user ? (
              <span>
                Connecté en tant que <strong>{user.email}</strong>
              </span>
            ) : (
              <span>{t("checkout.guestCheckout", "Commande invité · Aucun compte requis")}</span>
            )}
          </div>
        </header>

        {submitError && (
          <div className={styles.errorBanner} role="alert">
            <AlertTriangle size={20} style={{ flexShrink: 0 }} />
            <div className={styles.errorBannerContent}>
              <div className={styles.errorBannerTitle}>
                {t("checkout.submitErrorTitle", "Impossible de valider la commande")}
              </div>
              <div>{submitError}</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className={styles.grid}>
            <div className={styles.formCol}>
              {/* Coordonnées */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    {t("checkout.customerSection")}
                  </h2>
                </div>

                <div className={styles.row2}>
                  <div className={styles.fieldGroup}>
                    <Input
                      label={`${t("checkout.firstName")} *`}
                      placeholder="Ex: Awa"
                      autoComplete="given-name"
                      error={errors.first_name?.message}
                      {...register("first_name")}
                    />
                  </div>
                  <div className={styles.fieldGroup}>
                    <Input
                      label={`${t("checkout.fullName", "Nom complet")} *`}
                      placeholder="Ex: Awa Mensah"
                      autoComplete="name"
                      error={errors.full_name?.message}
                      {...register("full_name")}
                    />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <Input
                    label={`${t("checkout.phone")} *`}
                    type="tel"
                    placeholder="+228 90 12 34 56"
                    hint="Pour être joint par le livreur"
                    error={errors.phone?.message}
                    {...register("phone")}
                  />
                </div>
              </section>

              {/* Livraison */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    {t("checkout.shippingSection")}
                  </h2>
                </div>

                <div className={styles.row2}>
                  <div className={styles.fieldGroup}>
                    <Input
                      label={`${t("checkout.city")} *`}
                      list="checkout-cities"
                      placeholder="Ex: Lomé"
                      error={errors.city?.message}
                      {...register("city")}
                    />
                    <datalist id="checkout-cities">
                      {cities.map((city) => (
                        <option key={city} value={city} />
                      ))}
                    </datalist>
                  </div>
                  {showCountry && (
                    <div className={styles.fieldGroup}>
                      <Input
                        label={t("checkout.country", "Pays")}
                        list="checkout-countries"
                        placeholder="Ex: Togo"
                        error={errors.country?.message}
                        {...register("country")}
                      />
                      <datalist id="checkout-countries">
                        {countries.map((country) => (
                          <option key={country} value={country} />
                        ))}
                      </datalist>
                    </div>
                  )}
                </div>

                {loadingShipping ? (
                  <p className={styles.hint}>{t("common.loading")}</p>
                ) : isShippingValid && matchedShipping ? (
                  <div className={styles.shippingCard}>
                    <Truck size={24} className={styles.shippingIcon} />
                    <div className={styles.shippingInfo}>
                      <div className={styles.shippingTitle}>
                        {matchedShipping.zone.name}
                      </div>
                      <div className={styles.shippingDesc}>
                        {t("checkout.shippingAvailable", "Livraison disponible pour {{city}}, {{country}}.", {
                          city: watchedCity,
                          country: effectiveCountry,
                        })}
                      </div>
                    </div>
                    <div className={styles.shippingPrice}>
                      {matchedShipping.price === 0
                        ? t("checkout.freeShipping")
                        : formatXOF(matchedShipping.price)}
                    </div>
                  </div>
                ) : (
                  <div className={styles.shippingWarning}>
                    <AlertTriangle size={24} style={{ flexShrink: 0 }} />
                    <div>
                      <div className={styles.shippingWarningTitle}>
                        {t("checkout.shippingUnavailableTitle", "Livraison à confirmer")}
                      </div>
                      <div className={styles.shippingWarningText}>
                        {t("checkout.shippingUnavailableText", "Aucun tarif de livraison pour cette destination. Choisissez une ville desservie (ex : Lomé).")}
                      </div>
                    </div>
                  </div>
                )}

                {/* Position de livraison */}
                <div className={styles.positionBlock}>
                  <div className={styles.positionHeader}>
                    <MapPin size={16} />
                    <span className={styles.positionTitle}>
                      {t("checkout.positionTitle", "Position de livraison")}
                    </span>
                  </div>
                  <p className={styles.hint}>
                    {t("checkout.positionPrivacy", "Votre position sert uniquement à la livraison.")}
                  </p>

                  {geo.status === "saved" ? (
                    <div className={styles.geoSaved}>
                      <Navigation size={14} />
                      <span>{t("checkout.geoSaved", "Position enregistrée")}</span>
                      {geoMapsUrl && (
                        <a
                          href={geoMapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.geoLink}
                        >
                          {t("checkout.geoVerify", "Vérifier sur Google Maps")}
                        </a>
                      )}
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={geo.status === "locating"}
                      onClick={requestPosition}
                    >
                      <Navigation size={14} style={{ marginRight: 6 }} />
                      {geo.status === "locating"
                        ? t("checkout.geoLocating", "Localisation en cours…")
                        : t("checkout.geoButton", "Envoyer ma position")}
                    </Button>
                  )}

                  {geo.status === "error" && (
                    <p className={styles.promoError}>{geo.message}</p>
                  )}
                  {errors.lat && <p className={styles.promoError}>{errors.lat.message}</p>}
                  {errors.lng && <p className={styles.promoError}>{errors.lng.message}</p>}

                  <div className={styles.fieldGroup}>
                    <Input
                      label={t("checkout.mapsLinkLabel", "Ou colle un lien Google Maps")}
                      type="url"
                      placeholder="https://maps.app.goo.gl/…"
                      error={errors.maps_link?.message}
                      {...register("maps_link")}
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <Input
                      label={t("checkout.landmarkLabel", "Point de repère (quartier, près de)")}
                      placeholder="Ex: En face de la pharmacie, portail noir"
                      error={errors.landmark?.message}
                      {...register("landmark")}
                    />
                  </div>
                </div>
              </section>

              {/* Paiement */}
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>
                    {t("checkout.paymentSection")}
                  </h2>
                </div>
                <div className={styles.paymentCard}>
                  <Banknote size={26} className={styles.paymentIcon} />
                  <div className={styles.paymentInfo}>
                    <div className={styles.paymentTitleRow}>
                      <span className={styles.paymentTitle}>
                        {t("checkout.codLine", "Paiement à la livraison")}
                      </span>
                    </div>
                    <p className={styles.paymentDesc}>
                      {t("checkout.cashOnDeliveryDesc")}
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* Résumé */}
            <aside className={styles.summaryCol}>
              <div className={styles.summaryCard}>
                <div className={styles.summaryHeader}>
                  <h2 className={styles.summaryTitle}>{t("checkout.summarySection")}</h2>
                  <span className={styles.hint}>
                    {items.length} {items.length > 1 ? "articles" : "article"}
                  </span>
                </div>

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
                          {item.size && <span>{t("cart.sizeLabel")} {item.size}</span>}
                          {item.color && <span>· {item.color}</span>}
                          <span>· {t("cart.qty")} : {item.quantity}</span>
                        </div>
                      </div>
                      <div className={styles.itemPrice}>
                        {formatXOF(item.unit_price * item.quantity)}
                      </div>
                    </li>
                  ))}
                </ul>

                <div className={styles.totalsBreakdown}>
                  <div className={styles.calcRow}>
                    <span>{t("checkout.itemsSubtotal")}</span>
                    <span className={styles.calcValue}>{formatXOF(subtotal)}</span>
                  </div>
                  <div className={styles.calcRow}>
                    <span>{t("checkout.shippingFee")}</span>
                    {isShippingValid && shippingFee !== null ? (
                      <span className={styles.calcValue}>
                        {shippingFee === 0 ? t("checkout.freeShipping") : formatXOF(shippingFee)}
                      </span>
                    ) : (
                      <span className={styles.unconfirmedText}>
                        {t("checkout.shippingToConfirm", "Livraison à confirmer")}
                      </span>
                    )}
                  </div>
                  <div className={styles.divider} />
                  <div className={styles.totalRow}>
                    <span className={styles.totalLabel}>{t("checkout.total")}</span>
                    <div style={{ textAlign: "end" }}>
                      <span className={styles.totalAmount}>
                        {calculatedTotal !== null
                          ? formatXOF(calculatedTotal)
                          : formatXOF(subtotal)}
                      </span>
                      {currency !== "XOF" && (
                        <div style={{ fontSize: "var(--text-sm)", color: "var(--color-neutral-600)", marginTop: "2px" }}>
                          {formatPrice(calculatedTotal !== null ? calculatedTotal : subtotal)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className={styles.submitBtn}
                  disabled={isSubmitting || !isShippingValid || items.length === 0}
                  isLoading={isSubmitting}
                >
                  {isSubmitting
                    ? t("checkout.submitting")
                    : !isShippingValid
                    ? t("checkout.shippingUnavailableShort", "Livraison indisponible")
                    : t("checkout.submitOrder")}
                </Button>

                <div className={styles.guarantees}>
                  <div className={styles.guaranteeItem}>
                    <Lock size={14} />
                    <span>{t("checkout.codLine", "Paiement à la livraison")}</span>
                  </div>
                  <div className={styles.guaranteeItem}>
                    <ShieldCheck size={14} />
                    <span>{t("checkout.guaranteeCheck", "Vérification des articles avant règlement")}</span>
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
