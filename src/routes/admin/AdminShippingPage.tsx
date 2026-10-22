import { useState, useEffect, useCallback } from "react";
import {
  Truck,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  Scale,
  Power,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatXOF } from "@/lib/admin-utils";
import { useToast } from "@/components/ui/Toast";
import styles from "./AdminShippingPage.module.css";

interface ShippingRate {
  id: string;
  zone_id: string;
  name: string;
  min_weight_g: number;
  max_weight_g: number | null;
  price: number;
  currency: string;
  estimated_days: number | null;
  estimated_delivery?: string | null;
  is_active: boolean;
}

interface ShippingZone {
  id: string;
  name: string;
  countries: string[];
  regions?: string[] | null;
  cities?: string[] | null;
  is_active: boolean;
  shipping_rates?: ShippingRate[];
}

export default function AdminShippingPage() {
  const { showToast } = useToast();
  const [zones, setZones] = useState<ShippingZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal Zone
  const [zoneModalOpen, setZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ShippingZone | null>(null);
  const [zoneName, setZoneName] = useState("");
  const [zoneCountries, setZoneCountries] = useState("");
  const [zoneCities, setZoneCities] = useState("");
  const [zoneIsActive, setZoneIsActive] = useState(true);
  const [savingZone, setSavingZone] = useState(false);

  // Modal Rate — « ne propose aucun tarif par défaut »
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [rateZoneId, setRateZoneId] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<ShippingRate | null>(null);
  const [rateName, setRateName] = useState("");
  const [rateIsFlat, setRateIsFlat] = useState(true);
  const [rateMinWeight, setRateMinWeight] = useState("");
  const [rateMaxWeight, setRateMaxWeight] = useState("");
  const [ratePrice, setRatePrice] = useState("");
  const [rateEstDelivery, setRateEstDelivery] = useState("");
  const [rateEstDays, setRateEstDays] = useState("");
  const [rateIsActive, setRateIsActive] = useState(true);
  const [savingRate, setSavingRate] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("shipping_zones")
        .select("*, shipping_rates(*)")
        .order("name", { ascending: true });

      if (err) throw err;
      setZones(data as ShippingZone[]);
    } catch (e: unknown) {
      console.error("Erreur de chargement des zones de livraison", e);
      setError("Impossible de charger les zones et tarifs de livraison.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Zone Handlers
  const handleOpenZoneModal = (zone?: ShippingZone) => {
    if (zone) {
      setEditingZone(zone);
      setZoneName(zone.name);
      setZoneCountries((zone.countries || []).join(", "));
      const combinedCities = zone.cities && zone.cities.length > 0 ? zone.cities : (zone.regions || []);
      setZoneCities(combinedCities.join(", "));
      setZoneIsActive(zone.is_active);
    } else {
      setEditingZone(null);
      setZoneName("");
      setZoneCountries("Togo");
      setZoneCities("");
      setZoneIsActive(true);
    }
    setZoneModalOpen(true);
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneName.trim()) {
      showToast("Le nom de la zone est requis", "error");
      return;
    }

    const countries = zoneCountries
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    const cities = zoneCities
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    try {
      setSavingZone(true);
      const payload = {
        name: zoneName.trim(),
        countries: countries.length > 0 ? countries : ["Togo"],
        regions: cities,
        cities: cities,
        is_active: zoneIsActive,
      };

      if (editingZone) {
        const { error: err } = await supabase
          .from("shipping_zones")
          .update(payload)
          .eq("id", editingZone.id);

        if (err) throw err;
        showToast("Zone de livraison mise à jour", "success");
      } else {
        const { error: err } = await supabase
          .from("shipping_zones")
          .insert(payload);

        if (err) throw err;
        showToast("Nouvelle zone de livraison créée", "success");
      }

      setZoneModalOpen(false);
      await loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de l'enregistrement de la zone.";
      showToast(msg, "error");
    } finally {
      setSavingZone(false);
    }
  };

  const handleToggleZone = async (zone: ShippingZone) => {
    try {
      const { error: err } = await supabase
        .from("shipping_zones")
        .update({ is_active: !zone.is_active })
        .eq("id", zone.id);

      if (err) throw err;
      showToast(`Zone ${!zone.is_active ? "activée" : "désactivée"}`, "success");
      await loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors du changement de statut.";
      showToast(msg, "error");
    }
  };

  const handleDeleteZone = async (zone: ShippingZone) => {
    if (
      !window.confirm(
        `Voulez-vous vraiment supprimer la zone « ${zone.name} » et tous ses tarifs associés ?`
      )
    ) {
      return;
    }

    try {
      const { error: err } = await supabase
        .from("shipping_zones")
        .delete()
        .eq("id", zone.id);

      if (err) throw err;
      showToast("Zone supprimée avec succès", "success");
      await loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de la suppression.";
      showToast(msg, "error");
    }
  };

  // Rate Handlers — « ne propose aucun tarif par défaut »
  const handleOpenRateModal = (zoneId: string, rate?: ShippingRate) => {
    setRateZoneId(zoneId);
    if (rate) {
      setEditingRate(rate);
      setRateName(rate.name);
      setRateIsFlat(rate.min_weight_g === 0 && (rate.max_weight_g === null || rate.max_weight_g === undefined));
      setRateMinWeight(rate.min_weight_g ? String(rate.min_weight_g) : "0");
      setRateMaxWeight(rate.max_weight_g ? String(rate.max_weight_g) : "");
      setRatePrice(String(rate.price));
      setRateEstDelivery(rate.estimated_delivery || "");
      setRateEstDays(rate.estimated_days ? String(rate.estimated_days) : "");
      setRateIsActive(rate.is_active);
    } else {
      // Aucun tarif pré-rempli par défaut
      setEditingRate(null);
      setRateName("");
      setRateIsFlat(true);
      setRateMinWeight("");
      setRateMaxWeight("");
      setRatePrice("");
      setRateEstDelivery("");
      setRateEstDays("");
      setRateIsActive(true);
    }
    setRateModalOpen(true);
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateZoneId) return;

    if (!rateName.trim()) {
      showToast("Le nom du tarif est requis", "error");
      return;
    }

    if (ratePrice === "" || isNaN(Number(ratePrice)) || Number(ratePrice) < 0) {
      showToast("Veuillez saisir un prix valide en FCFA", "error");
      return;
    }

    try {
      setSavingRate(true);
      const minWeight = rateIsFlat ? 0 : Math.max(0, parseInt(rateMinWeight || "0", 10));
      const maxWeight = rateIsFlat || !rateMaxWeight.trim() ? null : parseInt(rateMaxWeight.trim(), 10);
      const estDays = rateEstDays.trim() ? parseInt(rateEstDays.trim(), 10) : null;

      const payload = {
        zone_id: rateZoneId,
        name: rateName.trim(),
        min_weight_g: minWeight,
        max_weight_g: maxWeight,
        price: Math.round(Number(ratePrice)),
        currency: "XOF",
        estimated_days: estDays,
        estimated_delivery: rateEstDelivery.trim() || null,
        is_active: rateIsActive,
      };

      if (editingRate) {
        const { error: err } = await supabase
          .from("shipping_rates")
          .update(payload)
          .eq("id", editingRate.id);

        if (err) throw err;
        showToast("Tarif mis à jour avec succès", "success");
      } else {
        const { error: err } = await supabase
          .from("shipping_rates")
          .insert(payload);

        if (err) throw err;
        showToast("Nouveau tarif ajouté", "success");
      }

      setRateModalOpen(false);
      await loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de l'enregistrement du tarif.";
      showToast(msg, "error");
    } finally {
      setSavingRate(false);
    }
  };

  const handleToggleRate = async (rate: ShippingRate) => {
    try {
      const { error: err } = await supabase
        .from("shipping_rates")
        .update({ is_active: !rate.is_active })
        .eq("id", rate.id);

      if (err) throw err;
      showToast(`Tarif ${!rate.is_active ? "activé" : "désactivé"}`, "success");
      await loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur de mise à jour.";
      showToast(msg, "error");
    }
  };

  const handleDeleteRate = async (rate: ShippingRate) => {
    if (!window.confirm(`Supprimer le tarif « ${rate.name} » ?`)) return;

    try {
      const { error: err } = await supabase
        .from("shipping_rates")
        .delete()
        .eq("id", rate.id);

      if (err) throw err;
      showToast("Tarif supprimé avec succès", "success");
      await loadData();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de la suppression.";
      showToast(msg, "error");
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Livraison</h1>
          <p className={styles.subtitle}>
            Zones géographiques, villes desservies et grilles tarifaires par zone.
          </p>
        </div>
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => handleOpenZoneModal()}
        >
          <Plus size={16} />
          <span>Nouvelle zone</span>
        </button>
      </header>

      {error && <div className={styles.alertBox}>{error}</div>}

      {loading ? (
        <p style={{ color: "var(--color-neutral-400)" }}>Chargement des zones et tarifs…</p>
      ) : zones.length === 0 ? (
        <div className={styles.emptyState}>
          <Truck size={36} color="var(--color-neutral-500)" style={{ margin: "0 auto 12px" }} />
          <p>Aucune zone de livraison configurée.</p>
          <p style={{ color: "var(--color-neutral-400)", fontSize: "0.85rem", marginTop: 4 }}>
            Créez une première zone (ex: « Lomé & Environs ») pour lui associer des tarifs.
          </p>
        </div>
      ) : (
        <div className={styles.zonesList}>
          {zones.map((zone) => {
            const rates = zone.shipping_rates || [];
            const displayCities =
              zone.cities && zone.cities.length > 0
                ? zone.cities
                : zone.regions && zone.regions.length > 0
                ? zone.regions
                : [];

            return (
              <div
                key={zone.id}
                className={`${styles.zoneCard} ${
                  !zone.is_active ? styles.zoneCardInactive : ""
                }`}
              >
                {/* Zone Header */}
                <div className={styles.zoneHeader}>
                  <div className={styles.zoneHeaderLeft}>
                    <h2 className={styles.zoneTitle}>{zone.name}</h2>
                    <span
                      className={
                        zone.is_active ? styles.badgeActive : styles.badgeInactive
                      }
                    >
                      {zone.is_active ? "Actif" : "Désactivé"}
                    </span>
                  </div>

                  <div className={styles.zoneHeaderActions}>
                    <button
                      type="button"
                      className={`${styles.smallBtn} ${styles.smallBtnPrimary}`}
                      onClick={() => handleOpenRateModal(zone.id)}
                    >
                      <Plus size={14} />
                      <span>Ajouter un tarif</span>
                    </button>
                    <button
                      type="button"
                      className={styles.smallBtn}
                      onClick={() => handleOpenZoneModal(zone)}
                    >
                      <Edit2 size={13} />
                      <span>Modifier</span>
                    </button>
                    <button
                      type="button"
                      className={styles.smallBtn}
                      onClick={() => handleToggleZone(zone)}
                      title={zone.is_active ? "Désactiver la zone" : "Activer la zone"}
                    >
                      <Power size={13} />
                      <span>{zone.is_active ? "Désactiver" : "Activer"}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.smallBtn} ${styles.smallBtnDanger}`}
                      onClick={() => handleDeleteZone(zone)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Zone Meta */}
                <div className={styles.zoneMeta}>
                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Pays :</span>
                    <div className={styles.tagList}>
                      {zone.countries && zone.countries.length > 0 ? (
                        zone.countries.map((c, i) => (
                          <span key={i} className={styles.tag}>
                            {c}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "var(--color-neutral-500)" }}>Tous pays</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.metaItem}>
                    <span className={styles.metaLabel}>Villes :</span>
                    <div className={styles.tagList}>
                      {displayCities.length > 0 ? (
                        displayCities.map((city, i) => (
                          <span key={i} className={styles.tag}>
                            <MapPin size={10} style={{ display: "inline", marginRight: 3 }} />
                            {city}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: "var(--color-neutral-400)" }}>
                          Toutes les villes du pays
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Rates Section */}
                <div className={styles.ratesSection}>
                  <h3 className={styles.ratesTitle}>
                    Tarifs d'expédition ({rates.length})
                  </h3>

                  {rates.length === 0 ? (
                    <div className={styles.emptyState}>
                      Aucun tarif défini pour cette zone. Aucun tarif par défaut n'est appliqué. Cliquez sur « Ajouter un tarif » pour en configurer un.
                    </div>
                  ) : (
                    <div className={styles.tableContainer}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Service / Intitulé</th>
                            <th>Mode & Poids</th>
                            <th>Prix (FCFA)</th>
                            <th>Délai estimé</th>
                            <th>Statut</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rates.map((rate) => {
                            const isFlat =
                              rate.min_weight_g === 0 &&
                              (rate.max_weight_g === null || rate.max_weight_g === undefined);

                            return (
                              <tr key={rate.id}>
                                <td style={{ fontWeight: 600 }}>{rate.name}</td>
                                <td>
                                  {isFlat ? (
                                    <span className={styles.rateWeight}>Tarif fixe</span>
                                  ) : (
                                    <span className={styles.rateWeight}>
                                      <Scale size={11} style={{ display: "inline", marginRight: 4 }} />
                                      {rate.min_weight_g} g –{" "}
                                      {rate.max_weight_g !== null ? `${rate.max_weight_g} g` : "illimité"}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <span className={styles.ratePrice}>
                                    {formatXOF(rate.price)}
                                  </span>
                                </td>
                                <td>
                                  {rate.estimated_delivery || (rate.estimated_days ? `${rate.estimated_days} jour(s)` : "—")}
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    onClick={() => handleToggleRate(rate)}
                                    className={rate.is_active ? styles.badgeActive : styles.badgeInactive}
                                    style={{ cursor: "pointer", border: "none" }}
                                    title="Cliquer pour basculer"
                                  >
                                    {rate.is_active ? "Actif" : "Désactivé"}
                                  </button>
                                </td>
                                <td>
                                  <div className={styles.actionsCell}>
                                    <button
                                      type="button"
                                      className={styles.smallBtn}
                                      onClick={() => handleOpenRateModal(zone.id, rate)}
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      type="button"
                                      className={`${styles.smallBtn} ${styles.smallBtnDanger}`}
                                      onClick={() => handleDeleteRate(rate)}
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Zone */}
      {zoneModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setZoneModalOpen(false)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingZone ? "Modifier la zone" : "Nouvelle zone de livraison"}
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setZoneModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveZone} className={styles.modalForm}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="zone_name">
                  Nom de la zone *
                </label>
                <input
                  id="zone_name"
                  type="text"
                  required
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  className={styles.input}
                  placeholder="ex: Grand Lomé, Intérieur du Togo, Sous-région"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="zone_countries">
                  Pays couverts (séparés par une virgule)
                </label>
                <input
                  id="zone_countries"
                  type="text"
                  value={zoneCountries}
                  onChange={(e) => setZoneCountries(e.target.value)}
                  className={styles.input}
                  placeholder="Togo, Bénin, Ghana"
                />
                <span className={styles.fieldHelp}>
                  Indiquez les noms des pays couverts par cette zone.
                </span>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="zone_cities">
                  Villes ou régions ciblées (séparées par une virgule)
                </label>
                <input
                  id="zone_cities"
                  type="text"
                  value={zoneCities}
                  onChange={(e) => setZoneCities(e.target.value)}
                  className={styles.input}
                  placeholder="Lomé, Baguida, Kpalimé, Sokodé (ou laisser vide pour tout le pays)"
                />
                <span className={styles.fieldHelp}>
                  Si renseigné, cette zone sera prioritaire pour les commandes livrées dans ces villes.
                </span>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={zoneIsActive}
                    onChange={(e) => setZoneIsActive(e.target.checked)}
                  />
                  <span>Zone active pour les commandes</span>
                </label>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setZoneModalOpen(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingZone}
                  className={styles.submitBtn}
                >
                  {savingZone ? "Enregistrement…" : "Enregistrer la zone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rate — Aucun tarif proposé par défaut */}
      {rateModalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setRateModalOpen(false)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingRate ? "Modifier le tarif" : "Nouveau tarif de livraison"}
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setRateModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveRate} className={styles.modalForm}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="rate_name">
                  Intitulé du tarif *
                </label>
                <input
                  id="rate_name"
                  type="text"
                  required
                  value={rateName}
                  onChange={(e) => setRateName(e.target.value)}
                  className={styles.input}
                  placeholder="ex: Livraison Standard, Express Moto, Colis Poste"
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Type de tarification</label>
                <div style={{ display: "flex", gap: 16 }}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="radio"
                      name="rateMode"
                      checked={rateIsFlat}
                      onChange={() => setRateIsFlat(true)}
                    />
                    <span>Tarif fixe (poids indifférent)</span>
                  </label>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="radio"
                      name="rateMode"
                      checked={!rateIsFlat}
                      onChange={() => setRateIsFlat(false)}
                    />
                    <span>Par tranche de poids</span>
                  </label>
                </div>
              </div>

              {!rateIsFlat && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel} htmlFor="min_weight">
                      Poids min (grammes)
                    </label>
                    <input
                      id="min_weight"
                      type="number"
                      min="0"
                      value={rateMinWeight}
                      onChange={(e) => setRateMinWeight(e.target.value)}
                      className={styles.input}
                      placeholder="0"
                    />
                  </div>

                  <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel} htmlFor="max_weight">
                      Poids max (grammes)
                    </label>
                    <input
                      id="max_weight"
                      type="number"
                      min="1"
                      value={rateMaxWeight}
                      onChange={(e) => setRateMaxWeight(e.target.value)}
                      className={styles.input}
                      placeholder="Laisser vide si sans limite"
                    />
                  </div>
                </div>
              )}

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="rate_price">
                  Prix en FCFA (XOF) *
                </label>
                <input
                  id="rate_price"
                  type="number"
                  required
                  min="0"
                  step="1"
                  value={ratePrice}
                  onChange={(e) => setRatePrice(e.target.value)}
                  className={styles.input}
                  placeholder="Saisissez un montant (ex: 2000)"
                />
                <span className={styles.fieldHelp}>
                  Montant exact facturé au client. Aucun tarif par défaut n'est imposé.
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="est_delivery">
                    Délai estimé (texte)
                  </label>
                  <input
                    id="est_delivery"
                    type="text"
                    value={rateEstDelivery}
                    onChange={(e) => setRateEstDelivery(e.target.value)}
                    className={styles.input}
                    placeholder="ex: 24h à 48h"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="est_days">
                    Délai (jours ouvrés)
                  </label>
                  <input
                    id="est_days"
                    type="number"
                    min="1"
                    value={rateEstDays}
                    onChange={(e) => setRateEstDays(e.target.value)}
                    className={styles.input}
                    placeholder="ex: 2"
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={rateIsActive}
                    onChange={(e) => setRateIsActive(e.target.checked)}
                  />
                  <span>Tarif actif</span>
                </label>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setRateModalOpen(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingRate}
                  className={styles.submitBtn}
                >
                  {savingRate ? "Enregistrement…" : "Enregistrer le tarif"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
