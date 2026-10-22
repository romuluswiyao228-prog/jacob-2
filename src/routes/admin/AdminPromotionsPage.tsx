import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  Tag,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatXOF } from "@/lib/admin-utils";
import { useToast } from "@/components/ui/Toast";
import styles from "./AdminPromotionsPage.module.css";

interface Promotion {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  currency: string;
  min_order_amount: number | null;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function AdminPromotionsPage() {
  const { showToast } = useToast();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired">("all");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [minOrderAmount, setMinOrderAmount] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const loadPromotions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: err } = await supabase
        .from("promotions")
        .select("*")
        .order("created_at", { ascending: false });

      if (err) throw err;
      setPromotions(data as Promotion[]);
    } catch (e: unknown) {
      console.error("Erreur de chargement des promotions", e);
      setError("Impossible de charger la liste des codes promo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  // Open modal
  const handleOpenModal = (promo?: Promotion) => {
    if (promo) {
      setEditingPromo(promo);
      setCode(promo.code);
      setDescription(promo.description || "");
      setDiscountType(promo.discount_type);
      setDiscountValue(String(promo.discount_value));
      setMinOrderAmount(promo.min_order_amount ? String(promo.min_order_amount) : "");
      setMaxUses(promo.max_uses ? String(promo.max_uses) : "");
      setStartsAt(promo.starts_at ? promo.starts_at.slice(0, 16) : "");
      setEndsAt(promo.ends_at ? promo.ends_at.slice(0, 16) : "");
      setIsActive(promo.is_active);
    } else {
      setEditingPromo(null);
      setCode("");
      setDescription("");
      setDiscountType("percentage");
      setDiscountValue("");
      setMinOrderAmount("");
      setMaxUses("");
      setStartsAt("");
      setEndsAt("");
      setIsActive(true);
    }
    setModalOpen(true);
  };

  const handleCopy = (promoCode: string) => {
    navigator.clipboard.writeText(promoCode);
    setCopiedCode(promoCode);
    showToast(`Code « ${promoCode} » copié !`, "info");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!cleanCode) {
      showToast("Le code promo est requis", "error");
      return;
    }

    const val = Number(discountValue);
    if (isNaN(val) || val <= 0) {
      showToast("Veuillez saisir une valeur de réduction valide", "error");
      return;
    }

    if (discountType === "percentage" && val > 100) {
      showToast("Le pourcentage de réduction ne peut pas dépasser 100%", "error");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        code: cleanCode,
        description: description.trim() || null,
        discount_type: discountType,
        discount_value: Math.round(val),
        currency: "XOF",
        min_order_amount: minOrderAmount.trim() ? Math.round(Number(minOrderAmount)) : null,
        max_uses: maxUses.trim() ? parseInt(maxUses.trim(), 10) : null,
        starts_at: startsAt ? new Date(startsAt).toISOString() : null,
        ends_at: endsAt ? new Date(endsAt).toISOString() : null,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      if (editingPromo) {
        const { error: err } = await supabase
          .from("promotions")
          .update(payload)
          .eq("id", editingPromo.id);

        if (err) throw err;
        showToast("Code promo mis à jour avec succès", "success");
      } else {
        const { error: err } = await supabase
          .from("promotions")
          .insert(payload);

        if (err) throw err;
        showToast("Nouveau code promo créé avec succès", "success");
      }

      setModalOpen(false);
      await loadPromotions();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de l'enregistrement.";
      showToast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (promo: Promotion) => {
    try {
      const { error: err } = await supabase
        .from("promotions")
        .update({ is_active: !promo.is_active })
        .eq("id", promo.id);

      if (err) throw err;
      showToast(`Code ${!promo.is_active ? "activé" : "désactivé"}`, "success");
      await loadPromotions();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur de mise à jour.";
      showToast(msg, "error");
    }
  };

  const handleDelete = async (promo: Promotion) => {
    if (!window.confirm(`Supprimer définitivement le code promo « ${promo.code} » ?`)) {
      return;
    }

    try {
      const { error: err } = await supabase
        .from("promotions")
        .delete()
        .eq("id", promo.id);

      if (err) throw err;
      showToast("Code promo supprimé avec succès", "success");
      await loadPromotions();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Erreur lors de la suppression.";
      showToast(msg, "error");
    }
  };

  // Filtered List
  const filteredPromotions = useMemo(() => {
    const now = new Date();
    return promotions.filter((p) => {
      // Search
      const s = search.trim().toLowerCase();
      if (s) {
        const matchCode = p.code.toLowerCase().includes(s);
        const matchDesc = (p.description || "").toLowerCase().includes(s);
        if (!matchCode && !matchDesc) return false;
      }

      // Status
      if (statusFilter === "active") return p.is_active;
      if (statusFilter === "inactive") return !p.is_active;
      if (statusFilter === "expired") {
        if (!p.ends_at) return false;
        return new Date(p.ends_at) < now;
      }
      return true;
    });
  }, [promotions, search, statusFilter]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Promotions & Codes</h1>
          <p className={styles.subtitle}>
            Créez des remises en pourcentage ou montant fixe, dates de validité et limites d'utilisation.
          </p>
        </div>
        <button
          type="button"
          className={styles.addBtn}
          onClick={() => handleOpenModal()}
        >
          <Plus size={16} />
          <span>Nouveau code promo</span>
        </button>
      </header>

      {error && <div className={styles.alertBox}>{error}</div>}

      {/* Filter Bar */}
      <div className={styles.filtersBar}>
        <input
          type="text"
          placeholder="Rechercher par code promo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className={styles.select}
        >
          <option value="all">Tous les statuts ({promotions.length})</option>
          <option value="active">Actifs</option>
          <option value="inactive">Désactivés</option>
          <option value="expired">Expirés</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: "var(--color-neutral-400)" }}>Chargement des promotions…</p>
      ) : filteredPromotions.length === 0 ? (
        <div className={styles.emptyState}>
          <Tag size={36} color="var(--color-neutral-500)" style={{ margin: "0 auto 12px" }} />
          <p>Aucun code promo trouvé.</p>
          <p style={{ color: "var(--color-neutral-400)", fontSize: "0.85rem", marginTop: 4 }}>
            Cliquez sur « Nouveau code promo » pour créer votre première offre.
          </p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Code Promo</th>
                <th>Remise</th>
                <th>Conditions</th>
                <th>Utilisation</th>
                <th>Période de validité</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPromotions.map((p) => {
                const now = new Date();
                const isExpired = p.ends_at && new Date(p.ends_at) < now;
                const isUpcoming = p.starts_at && new Date(p.starts_at) > now;

                return (
                  <tr key={p.id}>
                    <td>
                      <div className={styles.codeCell}>
                        <span className={styles.codeBadge}>{p.code}</span>
                        <button
                          type="button"
                          className={styles.smallBtn}
                          style={{ padding: "4px 8px" }}
                          onClick={() => handleCopy(p.code)}
                          title="Copier le code"
                        >
                          {copiedCode === p.code ? (
                            <Check size={12} color="var(--color-success)" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                      {p.description && (
                        <div style={{ fontSize: "0.75rem", color: "var(--color-neutral-400)", marginTop: 4 }}>
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className={styles.discountValue}>
                        {p.discount_type === "percentage"
                          ? `-${p.discount_value}%`
                          : `-${formatXOF(p.discount_value)}`}
                      </div>
                      <span className={styles.discountType}>
                        {p.discount_type === "percentage" ? "Pourcentage" : "Montant fixe"}
                      </span>
                    </td>
                    <td>
                      {p.min_order_amount ? (
                        <span style={{ fontSize: "0.8rem", color: "var(--color-neutral-300)" }}>
                          Dès {formatXOF(p.min_order_amount)}
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.8rem", color: "var(--color-neutral-500)" }}>
                          Sans minimum
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={styles.usageText}>
                        {p.used_count} / {p.max_uses !== null ? p.max_uses : "∞"}
                      </span>
                    </td>
                    <td>
                      <div className={styles.dateRangeText}>
                        {p.starts_at || p.ends_at ? (
                          <>
                            {p.starts_at && (
                              <div>
                                Du {new Date(p.starts_at).toLocaleDateString("fr-FR")}
                              </div>
                            )}
                            {p.ends_at && (
                              <div>
                                Au {new Date(p.ends_at).toLocaleDateString("fr-FR")}
                              </div>
                            )}
                          </>
                        ) : (
                          <span style={{ color: "var(--color-neutral-500)" }}>
                            Illimitée
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {isExpired ? (
                        <span className={styles.badgeExpired}>Expiré</span>
                      ) : isUpcoming ? (
                        <span className={styles.badgeInactive}>À venir</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p)}
                          className={p.is_active ? styles.badgeActive : styles.badgeInactive}
                          style={{ cursor: "pointer", border: "none" }}
                          title="Cliquer pour basculer"
                        >
                          {p.is_active ? "Actif" : "Désactivé"}
                        </button>
                      )}
                    </td>
                    <td>
                      <div className={styles.actionsCell}>
                        <button
                          type="button"
                          className={styles.smallBtn}
                          onClick={() => handleOpenModal(p)}
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          type="button"
                          className={`${styles.smallBtn} ${styles.smallBtnDanger}`}
                          onClick={() => handleDelete(p)}
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

      {/* Modal Promotion */}
      {modalOpen && (
        <div className={styles.modalBackdrop} onClick={() => setModalOpen(false)}>
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingPromo ? "Modifier le code promo" : "Nouveau code promotionnel"}
              </h2>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={() => setModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSavePromo} className={styles.modalForm}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="code">
                  Code promotionnel (majuscules) *
                </label>
                <input
                  id="code"
                  type="text"
                  required
                  value={code}
                  onChange={(e) =>
                    setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""))
                  }
                  className={styles.input}
                  placeholder="ex: WELCOME10, DROP2026, SUMMER"
                  style={{ textTransform: "uppercase", fontFamily: "var(--font-mono)" }}
                />
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel} htmlFor="description">
                  Description / Intitulé
                </label>
                <input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={styles.input}
                  placeholder="ex: Offre spéciale abonnés newsletter"
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="discount_type">
                    Type de remise *
                  </label>
                  <select
                    id="discount_type"
                    value={discountType}
                    onChange={(e) =>
                      setDiscountType(e.target.value as "percentage" | "fixed_amount")
                    }
                    className={styles.input}
                  >
                    <option value="percentage">Pourcentage (%)</option>
                    <option value="fixed_amount">Montant fixe (FCFA)</option>
                  </select>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="discount_value">
                    Valeur {discountType === "percentage" ? "(%)" : "(FCFA)"} *
                  </label>
                  <input
                    id="discount_value"
                    type="number"
                    required
                    min="1"
                    max={discountType === "percentage" ? "100" : undefined}
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className={styles.input}
                    placeholder={discountType === "percentage" ? "15" : "5000"}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="min_order">
                    Minimum de commande (FCFA)
                  </label>
                  <input
                    id="min_order"
                    type="number"
                    min="0"
                    value={minOrderAmount}
                    onChange={(e) => setMinOrderAmount(e.target.value)}
                    className={styles.input}
                    placeholder="ex: 25000 (facultatif)"
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="max_uses">
                    Limite d'utilisations totales
                  </label>
                  <input
                    id="max_uses"
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className={styles.input}
                    placeholder="ex: 50 (facultatif)"
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="starts_at">
                    Date de début
                  </label>
                  <input
                    id="starts_at"
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel} htmlFor="ends_at">
                    Date d'expiration
                  </label>
                  <input
                    id="ends_at"
                    type="datetime-local"
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                  />
                  <span>Code promotionnel actif</span>
                </label>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setModalOpen(false)}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className={styles.submitBtn}
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
