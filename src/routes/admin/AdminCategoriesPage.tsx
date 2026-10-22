import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { Plus, Edit2, Check, X, ArrowUp, ArrowDown } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/admin-utils";
import type { Category } from "@/lib/db-types";
import styles from "./AdminCategoriesPage.module.css";

const categorySchema = z.object({
  name: z.string().trim().min(2, "Le nom doit comporter au moins 2 caractères."),
  slug: z
    .string()
    .trim()
    .min(2, "Le slug doit comporter au moins 2 caractères.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide (minuscules, chiffres et tirets uniquement)"),
  description: z.string().trim().optional(),
  sort_order: z.coerce.number().int("L'ordre doit être un entier").default(0),
  is_active: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categorySchema>;

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: "",
    slug: "",
    description: "",
    sort_order: 0,
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (fetchErr) throw fetchErr;
      setCategories(data ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de chargement";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const openCreateModal = () => {
    const nextOrder = categories.length > 0 ? Math.max(...categories.map((c) => c.sort_order)) + 1 : 1;
    setEditingCategory(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      sort_order: nextOrder,
      is_active: true,
    });
    setFormErrors({});
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? "",
      sort_order: cat.sort_order,
      is_active: cat.is_active,
    });
    setFormErrors({});
    setModalError(null);
    setModalOpen(true);
  };

  const handleNameChange = (nameVal: string) => {
    setFormData((prev) => ({
      ...prev,
      name: nameVal,
      slug: editingCategory ? prev.slug : slugify(nameVal),
    }));
  };

  const toggleActive = async (cat: Category) => {
    try {
      const nextActive = !cat.is_active;
      const { error: updateErr } = await supabase
        .from("categories")
        .update({ is_active: nextActive })
        .eq("id", cat.id);

      if (updateErr) throw updateErr;
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, is_active: nextActive } : c))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors du changement de statut";
      setError(msg);
    }
  };

  const moveOrder = async (cat: Category, direction: "up" | "down") => {
    const currentIndex = categories.findIndex((c) => c.id === cat.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const targetCat = categories[targetIndex];
    const newOrder = targetCat.sort_order;
    const oldOrder = cat.sort_order;

    try {
      const { error: err1 } = await supabase
        .from("categories")
        .update({ sort_order: newOrder })
        .eq("id", cat.id);
      if (err1) throw err1;

      const { error: err2 } = await supabase
        .from("categories")
        .update({ sort_order: oldOrder })
        .eq("id", targetCat.id);
      if (err2) throw err2;

      await loadCategories();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors du changement d'ordre";
      setError(msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setFormErrors({});

    const result = categorySchema.safeParse(formData);
    if (!result.success) {
      const errors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        if (issue.path[0]) {
          errors[issue.path[0].toString()] = issue.message;
        }
      }
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: result.data.name,
        slug: result.data.slug,
        description: result.data.description || null,
        sort_order: result.data.sort_order,
        is_active: result.data.is_active,
      };

      if (editingCategory) {
        const { error: updateErr } = await supabase
          .from("categories")
          .update(payload)
          .eq("id", editingCategory.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from("categories")
          .insert(payload);
        if (insertErr) throw insertErr;
      }

      setModalOpen(false);
      await loadCategories();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
      setModalError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Catégories</h1>
          <p className={styles.subtitle}>
            Organisez les rayons du catalogue ({categories.length} catégories).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className={styles.primaryBtn}
        >
          <Plus size={16} />
          <span>Nouvelle catégorie</span>
        </button>
      </header>

      {error && <div className={styles.alertBox}>{error}</div>}

      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.emptyState}>Chargement des catégories…</div>
        ) : categories.length === 0 ? (
          <div className={styles.emptyState}>
            Aucune catégorie pour le moment. Cliquez sur « Nouvelle catégorie » pour commencer.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Ordre</th>
                <th>Nom</th>
                <th>Slug</th>
                <th>Description</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, idx) => (
                <tr key={cat.id}>
                  <td className={styles.orderCell}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>#{cat.sort_order}</span>
                      <button
                        type="button"
                        onClick={() => moveOrder(cat, "up")}
                        disabled={idx === 0}
                        style={{
                          opacity: idx === 0 ? 0.3 : 1,
                          cursor: idx === 0 ? "not-allowed" : "pointer",
                          color: "inherit",
                        }}
                        title="Monter"
                      >
                        <ArrowUp size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveOrder(cat, "down")}
                        disabled={idx === categories.length - 1}
                        style={{
                          opacity: idx === categories.length - 1 ? 0.3 : 1,
                          cursor: idx === categories.length - 1 ? "not-allowed" : "pointer",
                          color: "inherit",
                        }}
                        title="Descendre"
                      >
                        <ArrowDown size={12} />
                      </button>
                    </div>
                  </td>
                  <td className={styles.nameCell}>{cat.name}</td>
                  <td className={styles.slugCell}>{cat.slug}</td>
                  <td className={styles.descCell} title={cat.description ?? ""}>
                    {cat.description || "—"}
                  </td>
                  <td>
                    {cat.is_active ? (
                      <span className={styles.badgeActive}>Active</span>
                    ) : (
                      <span className={styles.badgeInactive}>Inactive</span>
                    )}
                  </td>
                  <td>
                    <div className={styles.actionsCell}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => openEditModal(cat)}
                      >
                        <Edit2 size={13} style={{ marginRight: 4 }} />
                        Modifier
                      </button>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => toggleActive(cat)}
                        title={cat.is_active ? "Désactiver" : "Activer"}
                      >
                        {cat.is_active ? (
                          <>
                            <X size={13} style={{ marginRight: 4 }} />
                            Désactiver
                          </>
                        ) : (
                          <>
                            <Check size={13} style={{ marginRight: 4 }} />
                            Activer
                          </>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal create / edit */}
      {modalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => setModalOpen(false)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingCategory ? "Modifier la catégorie" : "Nouvelle catégorie"}
              </h2>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              {modalError && <div className={styles.alertBox}>{modalError}</div>}

              <div className={styles.formField}>
                <label className={styles.label} htmlFor="cat-name">
                  Nom de la catégorie *
                </label>
                <input
                  id="cat-name"
                  type="text"
                  className={styles.input}
                  placeholder="Ex : T-shirts"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
                {formErrors.name && (
                  <span className={styles.fieldError}>{formErrors.name}</span>
                )}
              </div>

              <div className={styles.formField}>
                <label className={styles.label} htmlFor="cat-slug">
                  Slug (identifiant URL) *
                </label>
                <input
                  id="cat-slug"
                  type="text"
                  className={styles.input}
                  placeholder="ex : t-shirts"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, slug: slugify(e.target.value) }))
                  }
                  required
                />
                {formErrors.slug && (
                  <span className={styles.fieldError}>{formErrors.slug}</span>
                )}
              </div>

              <div className={styles.formField}>
                <label className={styles.label} htmlFor="cat-desc">
                  Description (optionnel)
                </label>
                <textarea
                  id="cat-desc"
                  className={styles.textarea}
                  placeholder="Courte description pour la boutique..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label} htmlFor="cat-order">
                  Ordre d'affichage
                </label>
                <input
                  id="cat-order"
                  type="number"
                  className={styles.input}
                  value={formData.sort_order}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      sort_order: parseInt(e.target.value, 10) || 0,
                    }))
                  }
                />
                {formErrors.sort_order && (
                  <span className={styles.fieldError}>{formErrors.sort_order}</span>
                )}
              </div>

              <div className={styles.checkboxRow}>
                <input
                  id="cat-active"
                  type="checkbox"
                  className={styles.checkbox}
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                />
                <label htmlFor="cat-active" className={styles.checkboxLabel}>
                  Catégorie active et visible dans la boutique
                </label>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className={styles.primaryBtn}
                  disabled={submitting}
                >
                  {submitting
                    ? "Enregistrement…"
                    : editingCategory
                    ? "Mettre à jour"
                    : "Créer la catégorie"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
