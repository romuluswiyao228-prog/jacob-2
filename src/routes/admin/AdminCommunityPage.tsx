import { useEffect, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  ImagePlus,
  Trash2,
  Upload,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { resizeImage } from "@/lib/admin-utils";
import type { CommunityPhoto } from "@/lib/db-types";
import { useToast } from "@/components/ui/Toast";
import styles from "./AdminCommunityPage.module.css";

type LinkOption = {
  value: string;
  label: string;
};

export default function AdminCommunityPage() {
  const { showToast } = useToast();
  const [photos, setPhotos] = useState<CommunityPhoto[]>([]);
  const [linkOptions, setLinkOptions] = useState<LinkOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);

      const [{ data: photoData, error: photoError }, { data: productData, error: productError }, { data: collectionData, error: collectionError }] = await Promise.all([
        supabase
          .from("community_photos")
          .select("id, image_url, alt_text, caption, link_path, sort_order, is_active, consent_confirmed, created_at")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false }),
        supabase
          .from("products")
          .select("id, slug, name")
          .order("name", { ascending: true }),
        supabase
          .from("collections")
          .select("id, slug, name")
          .order("name", { ascending: true }),
      ]);

      if (photoError) throw photoError;
      if (productError) throw productError;
      if (collectionError) throw collectionError;

      const productLinks = (productData ?? []).map((product) => ({
        value: `/produit/${product.slug}`,
        label: `Produit — ${product.name}`,
      }));
      const collectionLinks = (collectionData ?? []).map((collection) => ({
        value: `/collection/${collection.slug}`,
        label: `Collection — ${collection.name}`,
      }));

      setPhotos((photoData as CommunityPhoto[]) ?? []);
      setLinkOptions([...productLinks, ...collectionLinks]);
    } catch (error) {
      console.error("Erreur de chargement des photos de communauté", error);
      showToast("Impossible de charger les photos de la communauté.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const persistPhoto = async (photo: CommunityPhoto) => {
    const { error } = await supabase
      .from("community_photos")
      .update({
        alt_text: photo.alt_text,
        caption: photo.caption ?? null,
        link_path: photo.link_path ?? null,
        sort_order: photo.sort_order,
        is_active: photo.is_active,
        consent_confirmed: photo.consent_confirmed,
      })
      .eq("id", photo.id);

    if (error) throw error;
  };

  const updatePhoto = async (photoId: string, patch: Partial<CommunityPhoto>) => {
    const nextPhoto = photos.find((photo) => photo.id === photoId);
    if (!nextPhoto) return;

    const updated = { ...nextPhoto, ...patch };
    setPhotos((current) => current.map((photo) => (photo.id === photoId ? updated : photo)));

    try {
      await persistPhoto(updated);
    } catch (error) {
      console.error("Erreur de sauvegarde de la photo", error);
      showToast("La photo n'a pas pu être enregistrée.", "error");
    }
  };

  const handleUploadFiles = async (inputFiles: FileList | null) => {
    if (!inputFiles || inputFiles.length === 0) return;

    try {
      setUploading(true);
      const files = Array.from(inputFiles);
      const nextSort = photos.reduce((max, photo) => Math.max(max, photo.sort_order), 0);

      for (const [index, file] of files.entries()) {
        const resizedFile = await resizeImage(file, { maxDimension: 1600, quality: 0.9 });
        const path = `community/${Date.now()}-${Math.random().toString(16).slice(2)}-${file.name.replace(/\s+/g, "-")}`;

        const { error: uploadError } = await supabase.storage
          .from("store-assets")
          .upload(path, resizedFile, { cacheControl: "3600", upsert: false });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage.from("store-assets").getPublicUrl(path);
        const publicUrl = publicData.publicUrl;

        const { error: insertError } = await supabase
          .from("community_photos")
          .insert([
            {
              image_url: publicUrl,
              alt_text: file.name.replace(/\.[^.]+$/, "") || "Photo communautaire",
              caption: "",
              link_path: null,
              sort_order: nextSort + index + 1,
              is_active: false,
              consent_confirmed: false,
            },
          ]);

        if (insertError) throw insertError;
      }

      showToast(`${files.length} photo(s) ajoutée(s) à la galerie.`, "success");
      await loadData();
    } catch (error) {
      console.error("Erreur d'envoi des photos", error);
      showToast("Une erreur est survenue pendant l'envoi des photos.", "error");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handlePhotoDelete = async (photoId: string) => {
    try {
      const { error } = await supabase.from("community_photos").delete().eq("id", photoId);
      if (error) throw error;
      setPhotos((current) => current.filter((photo) => photo.id !== photoId));
      showToast("Photo supprimée.", "success");
    } catch (error) {
      console.error("Erreur de suppression", error);
      showToast("La photo n'a pas pu être supprimée.", "error");
    }
  };

  const handleConsentToggle = async (photoId: string, checked: boolean) => {
    const photo = photos.find((entry) => entry.id === photoId);
    if (!photo) return;

    const nextPhoto = {
      ...photo,
      consent_confirmed: checked,
      is_active: checked ? photo.is_active : false,
    };

    setPhotos((current) => current.map((entry) => (entry.id === photoId ? nextPhoto : entry)));

    try {
      await persistPhoto(nextPhoto);
      if (!checked) {
        showToast("L'activation est bloquée tant que le consentement n'est pas confirmé.", "warning");
      }
    } catch (error) {
      console.error("Erreur de mise à jour du consentement", error);
      showToast("Le consentement n'a pas pu être enregistré.", "error");
    }
  };

  const handleActivationToggle = async (photoId: string) => {
    const photo = photos.find((entry) => entry.id === photoId);
    if (!photo) return;

    if (!photo.consent_confirmed) {
      showToast("Cette photo ne peut pas être activée sans accord de la personne.", "warning");
      return;
    }

    const nextPhoto = { ...photo, is_active: !photo.is_active };
    setPhotos((current) => current.map((entry) => (entry.id === photoId ? nextPhoto : entry)));

    try {
      await persistPhoto(nextPhoto);
    } catch (error) {
      console.error("Erreur de mise à jour de l'état de la photo", error);
      showToast("Le statut d'activation n'a pas pu être enregistré.", "error");
    }
  };

  const handleMove = async (photoId: string, direction: "up" | "down") => {
    const sorted = [...photos].sort((a, b) => a.sort_order - b.sort_order);
    const index = sorted.findIndex((photo) => photo.id === photoId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (index < 0 || targetIndex < 0 || targetIndex >= sorted.length) return;

    const reordered = [...sorted];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    const updatedPhotos = reordered.map((photo, idx) => ({ ...photo, sort_order: idx }));
    setPhotos(updatedPhotos);

    try {
      await Promise.all(
        updatedPhotos.map((photo) =>
          supabase.from("community_photos").update({ sort_order: photo.sort_order }).eq("id", photo.id)
        )
      );
      showToast("L'ordre de la galerie a bien été mis à jour.", "success");
    } catch (error) {
      console.error("Erreur de réorganisation", error);
      showToast("L'ordre n'a pas pu être enregistré.", "error");
    }
  };

  const orderedPhotos = [...photos].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Galerie</p>
          <h1 className={styles.title}>Porté par la communauté</h1>
        </div>

        <div className={styles.headerActions}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className={styles.hiddenInput}
            onChange={(event) => {
              void handleUploadFiles(event.target.files);
            }}
          />
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={16} />
            <span>{uploading ? "Envoi…" : "Ajouter des photos"}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <p className={styles.loading}>Chargement des photos…</p>
      ) : orderedPhotos.length === 0 ? (
        <div className={styles.emptyState}>
          <ImagePlus size={28} />
          <p>Aucune photo pour le moment. Téléversez la première photo de la communauté.</p>
        </div>
      ) : (
        <div className={styles.list}>
          {orderedPhotos.map((photo, index) => (
            <article key={photo.id} className={styles.card}>
              <div className={styles.previewWrap}>
                <img src={photo.image_url} alt={photo.alt_text || "Photo de la communauté"} className={styles.previewImage} />
              </div>

              <div className={styles.fields}>
                <label className={styles.fieldLabel}>
                  Texte alternatif
                  <input
                    type="text"
                    value={photo.alt_text}
                    onChange={(event) =>
                      setPhotos((current) =>
                        current.map((entry) =>
                          entry.id === photo.id ? { ...entry, alt_text: event.target.value } : entry
                        )
                      )
                    }
                    onBlur={() => void persistPhoto(photo)}
                    className={styles.input}
                  />
                </label>

                <label className={styles.fieldLabel}>
                  Légende
                  <textarea
                    value={photo.caption ?? ""}
                    onChange={(event) =>
                      setPhotos((current) =>
                        current.map((entry) =>
                          entry.id === photo.id ? { ...entry, caption: event.target.value } : entry
                        )
                      )
                    }
                    onBlur={() => void persistPhoto(photo)}
                    className={styles.textarea}
                  />
                </label>

                <label className={styles.fieldLabel}>
                  Lien interne
                  <select
                    value={photo.link_path ?? ""}
                    onChange={(event) =>
                      void updatePhoto(photo.id, { link_path: event.target.value || null })
                    }
                    className={styles.select}
                  >
                    <option value="">Aucun lien</option>
                    {linkOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className={styles.metaRow}>
                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={photo.consent_confirmed}
                      onChange={(event) => void handleConsentToggle(photo.id, event.target.checked)}
                    />
                    <span>J'ai l'accord de la personne pour afficher cette photo.</span>
                  </label>

                  <label className={styles.checkboxRow}>
                    <input
                      type="checkbox"
                      checked={photo.is_active}
                      disabled={!photo.consent_confirmed}
                      onChange={() => void handleActivationToggle(photo.id)}
                    />
                    <span>Activer la photo</span>
                  </label>
                </div>

                <div className={styles.footerRow}>
                  <div className={styles.orderGroup}>
                    <button
                      type="button"
                      className={styles.smallButton}
                      onClick={() => void handleMove(photo.id, "up")}
                      disabled={index === 0}
                      aria-label="Monter"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className={styles.smallButton}
                      onClick={() => void handleMove(photo.id, "down")}
                      disabled={index === orderedPhotos.length - 1}
                      aria-label="Descendre"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>

                  <div className={styles.statusGroup}>
                    <button
                      type="button"
                      className={styles.simpleButton}
                      onClick={() => void handleActivationToggle(photo.id)}
                    >
                      {photo.is_active ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span>{photo.is_active ? "Masquer" : "Afficher"}</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.simpleButton} ${styles.deleteButton}`}
                      onClick={() => void handlePhotoDelete(photo.id)}
                    >
                      <Trash2 size={14} />
                      <span>Supprimer</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
