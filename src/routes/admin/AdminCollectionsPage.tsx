import { useState, useEffect, useCallback } from "react";
import { z } from "zod";
import { Plus, Edit2, Check, X, Layers } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/lib/admin-utils";
import type { Collection } from "@/lib/db-types";
import styles from "./AdminCollectionsPage.module.css";

const collectionSchema = z.object({
  name: z.string().trim().min(2, "Le nom doit comporter au moins 2 caractères."),
  slug: z
    .string()
    .trim()
    .min(2, "Le slug doit comporter au moins 2 caractères.")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide (minuscules, chiffres et tirets uniquement)"),
  description: z.string().trim().optional(),
  image_url: z.string().trim().optional(),
  is_active: z.boolean().default(true),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
});

type CollectionFormData = z.infer<typeof collectionSchema>;

export default function AdminCollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [formData, setFormData] = useState<CollectionFormData>({
    name: "",
    slug: "",
    description: "",
    image_url: "",
    is_active: true,
    starts_at: "",
    ends_at: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const loadCollections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("collections")
        .select("*")
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      setCollections(data ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de chargement";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  const openCreateModal = () => {
    setEditingCollection(null);
    setFormData({
      name: "",
      slug: "",
      description: "",
      image_url: "",
      is_active: true,
      starts_at: "",
      ends_at: "",
    });
    setFormErrors({});
    setModalError(null);
    setModalOpen(true);
  };

  const openEditModal = (col: Collection) => {
    setEditingCollection(col);
    setFormData({
      name: col.name,
      slug: col.slug,
      description: col.description ?? "",
      image_url: col.image_url ?? "",
      is_active: col.is_active,
      starts_at: col.starts_at ? col.starts_at.slice(0, 10) : "",
      ends_at: col.ends_at ? col.ends_at.slice(0, 10) : "",
    });
    setFormErrors({});
    setModalError(null);
    setModalOpen(true);
  };

  const handleNameChange = (nameVal: string) => {
    setFormData((prev) => ({
      ...prev,
      name: nameVal,
      slug: editingCollection ? prev.slug : slugify(nameVal),
    }));
  };

  const toggleActive = async (col: Collection) => {
    try {
      const nextActive = !col.is_active;
      const { error: updateErr } = await supabase
        .from("collections")
        .update({ is_active: nextActive })
        .eq("id", col.id);

      if (updateErr) throw updateErr;
      setCollections((prev) =>
        prev.map((c) => (c.id === col.id ? { ...c, is_active: nextActive } : c))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de mise à jour";
      setError(msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setFormErrors({});

    const result = collectionSchema.safeParse(formData);
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
        image_url: result.data.image_url || null,
        is_active: result.data.is_active,
        starts_at: result.data.starts_at ? new Date(result.data.starts_at).toISOString() : null,
        ends_at: result.data.ends_at ? new Date(result.data.ends_at).toISOString() : null,
      };

      if (editingCollection) {
        const { error: updateErr } = await supabase
          .from("collections")
          .update(payload)
          .eq("id", editingCollection.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from("collections")
          .insert(payload);
        if (insertErr) throw insertErr;
      }

      setModalOpen(false);
      await loadCollections();
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
          <h1 className={styles.title}>Collections</h1>
          <p className={styles.subtitle}>
            Gérez les drops et collections temporaires ({collections.length} collections).
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className={styles.primaryBtn}
        >
          <Plus size={16} />
          <span>Nouvelle collection</span>
        </button>
      </header>

      {error && <div className={styles.alertBox}>{error}</div>}

      <div className={styles.tableContainer}>
        {loading ? (
          <div className={styles.emptyState}>Chargement des collections…</div>
        ) : collections.length === 0 ? (
          <div className={styles.emptyState}>
            Aucune collection enregistrée. Cliquez sur « Nouvelle collection » pour en créer une.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Visuel</th>
                <th>Nom</th>
                <th>Slug</th>
                <th>Description</th>
                <th>Période</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {collections.map((col) => (
                <tr key={col.id}>
                  <td>
                    {col.image_url ? (
                      <img
                        src={col.image_url}
                        alt={col.name}
                        className={styles.thumbImg}
                      />
                    ) : (
                      <div className={styles.thumbPlaceholder}>
                        <Layers size={18} />
                      </div>
                    )}
                  </td>
                  <td className={styles.nameCell}>{col.name}</td>
                  <td className={styles.slugCell}>{col.slug}</td>
                  <td className={styles.descCell} title={col.description ?? ""}>
                    {col.description || "—"}
                  </td>
                  <td className={styles.dateCell}>
                    {col.starts_at || col.ends_at ? (
                      <>
                        {col.starts_at ? new Date(col.starts_at).toLocaleDateString("fr-FR") : "Début"}
                        {" → "}
                        {col.ends_at ? new Date(col.ends_at).toLocaleDateString("fr-FR") : "Toujours"}
                      </>
                    ) : (
                      "Permanente"
                    )}
                  </td>
                  <td>
                    {col.is_active ? (
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
                        onClick={() => openEditModal(col)}
                      >
                        <Edit2 size={13} style={{ marginRight: 4 }} />
                        Modifier
                      </button>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => toggleActive(col)}
                        title={col.is_active ? "Désactiver" : "Activer"}
                      >
                        {col.is_active ? (
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
                {editingCollection ? "Modifier la collection" : "Nouvelle collection"}
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
                <label className={styles.label} htmlFor="col-name">
                  Nom de la collection *
                </label>
                <input
                  id="col-name"
                  type="text"
                  className={styles.input}
                  placeholder="Ex : Drop Hiver 2026"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
                {formErrors.name && (
                  <span className={styles.fieldError}>{formErrors.name}</span>
                )}
              </div>

              <div className={styles.formField}>
                <label className={styles.label} htmlFor="col-slug">
                  Slug (identifiant URL) *
                </label>
                <input
                  id="col-slug"
                  type="text"
                  className={styles.input}
                  placeholder="ex : drop-hiver-2026"
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
                <label className={styles.label} htmlFor="col-desc">
                  Description
                </label>
                <textarea
                  id="col-desc"
                  className={styles.textarea}
                  placeholder="Description narrative de la collection..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>

              <div className={styles.formField}>
                <label className={styles.label} htmlFor="col-image">
                  URL de l'image de couverture
                </label>
                <input
                  id="col-image"
                  type="text"
                  className={styles.input}
                  placeholder="https://..."
                  value={formData.image_url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, image_url: e.target.value }))
                  }
                />
              </div>

              <div className={styles.twoCols}>
                <div className={styles.formField}>
                  <label className={styles.label} htmlFor="col-start">
                    Date de début (optionnelle)
                  </label>
                  <input
                    id="col-start"
                    type="date"
                    className={styles.input}
                    value={formData.starts_at}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, starts_at: e.target.value }))
                    }
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.label} htmlFor="col-end">
                    Date de fin (optionnelle)
                  </label>
                  <input
                    id="col-end"
                    type="date"
                    className={styles.input}
                    value={formData.ends_at}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, ends_at: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className={styles.checkboxRow}>
                <input
                  id="col-active"
                  type="checkbox"
                  className={styles.checkbox}
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, is_active: e.target.checked }))
                  }
                />
                <label htmlFor="col-active" className={styles.checkboxLabel}>
                  Collection active et visible
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
                    : editingCollection
                    ? "Mettre à jour"
                    : "Créer la collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
