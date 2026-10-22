import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import {
  ArrowLeft,
  Save,
  Archive,
  RotateCcw,
  Upload,
  Plus,
  Trash2,
  Star,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { slugify, resizeImageToMax1600 } from "@/lib/admin-utils";
import { isNoSizeCategory } from "@/lib/sizes";
import type { Category } from "@/lib/db-types";
import styles from "./AdminProductEditPage.module.css";

const productFormSchema = z
  .object({
    name: z.string().trim().min(2, "Le nom est obligatoire (au moins 2 caractères)."),
    slug: z
      .string()
      .trim()
      .min(2, "Le slug est obligatoire.")
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide (minuscules, chiffres, tirets)."),
    description: z.string().trim().optional(),
    category_id: z.string().nullable().optional(),
    price: z.coerce
      .number({ invalid_type_error: "Le prix doit être un nombre entier" })
      .int("Le prix doit être un nombre entier (XOF)")
      .min(0, "Le prix doit être supérieur ou égal à 0"),
    compare_at_price: z.preprocess(
      (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
      z
        .number({ invalid_type_error: "Le prix barré doit être un entier" })
        .int("Le prix barré doit être un nombre entier")
        .min(1)
        .nullable()
    ),
    visible: z.boolean(),
    is_featured: z.boolean(),
  })
  .refine(
    (data) => !data.compare_at_price || data.compare_at_price > data.price,
    {
      message: "Le prix barré compare_at_price doit être strictement supérieur au prix de vente.",
      path: ["compare_at_price"],
    }
  );

interface VariantDraft {
  tempId: string;
  id?: string;
  size: string;
  color: string;
  sku: string;
  stock: number;
  price: string;
}

interface ImageDraft {
  tempId: string;
  id?: string;
  url: string;
  alt_text: string;
  sort_order: number;
  is_primary: boolean;
}

export default function AdminProductEditPage() {
  const { id: routeProductId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(routeProductId && routeProductId !== "nouveau");

  // Stable UUID for new product so images can be uploaded directly
  const [productId] = useState<string>(() =>
    isEditing ? routeProductId! : crypto.randomUUID()
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [manualSlug, setManualSlug] = useState(false);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [price, setPrice] = useState<string>("");
  const [compareAtPrice, setCompareAtPrice] = useState<string>("");
  const [visible, setVisible] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Variants & Images
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);

  // Load categories and initial product if editing
  const loadInitialData = useCallback(async () => {
    try {
      const { data: catData, error: catErr } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true });
      if (catErr) throw catErr;
      setCategories(catData ?? []);

      if (isEditing) {
        const { data: prod, error: prodErr } = await supabase
          .from("products")
          .select("*")
          .eq("id", routeProductId)
          .single();
        if (prodErr) throw prodErr;

        setName(prod.name);
        setSlug(prod.slug);
        setManualSlug(true);
        setDescription(prod.description ?? "");
        setCategoryId(prod.category_id ?? "");
        setPrice(String(prod.price));
        setCompareAtPrice(prod.compare_at_price ? String(prod.compare_at_price) : "");
        setVisible(!prod.is_archived);
        setIsFeatured(prod.is_featured);

        // Load variants
        const { data: varsData } = await supabase
          .from("product_variants")
          .select("*")
          .eq("product_id", routeProductId)
          .order("created_at", { ascending: true });

        if (varsData && varsData.length > 0) {
          setVariants(
            varsData.map((v) => ({
              tempId: v.id,
              id: v.id,
              size: v.size ?? "",
              color: v.color ?? "",
              sku: v.sku,
              stock: v.stock,
              price: v.price != null ? String(v.price) : "",
            }))
          );
        } else {
          // Initialize with default variant
          setVariants([
            {
              tempId: crypto.randomUUID(),
              size: "M",
              color: "Noir",
              sku: `${prod.slug.toUpperCase()}-M-NOIR`,
              stock: 10,
              price: "",
            },
          ]);
        }

        // Load images
        const { data: imgsData } = await supabase
          .from("product_images")
          .select("*")
          .eq("product_id", routeProductId)
          .order("sort_order", { ascending: true });

        if (imgsData) {
          setImages(
            imgsData.map((img) => ({
              tempId: img.id,
              id: img.id,
              url: img.url,
              alt_text: img.alt_text ?? "",
              sort_order: img.sort_order,
              is_primary: img.is_primary,
            }))
          );
        }
      } else {
        // New product default variant
        setVariants([
          {
            tempId: crypto.randomUUID(),
            size: "M",
            color: "Noir",
            sku: "",
            stock: 10,
            price: "",
          },
        ]);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de chargement";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [isEditing, routeProductId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Handle name change and automatic slug
  const handleNameChange = (val: string) => {
    setName(val);
    if (!manualSlug) {
      const generated = slugify(val);
      setSlug(generated);
      // Auto-update empty SKUs
      setVariants((prev) =>
        prev.map((v) => {
          if (!v.id && (!v.sku || v.sku.startsWith("PROD-"))) {
            return {
              ...v,
              sku: `${generated.toUpperCase()}-${v.size || "STD"}-${slugify(v.color || "STD").toUpperCase()}`,
            };
          }
          return v;
        })
      );
    }
  };

  // When category changes, check if category is "bijoux" or "lunettes"
  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const cat = categories.find((c) => c.id === newCatId);
    if (cat && isNoSizeCategory(cat.slug)) {
      // Suggest/apply "Unique" size to variants
      setVariants((prev) =>
        prev.map((v) => ({
          ...v,
          size: "Unique",
          sku: v.sku.replace(/-[A-Z0-9]+-/, "-UNIQUE-"),
        }))
      );
    }
  };

  // Variants management
  const addVariant = () => {
    const selectedCat = categories.find((c) => c.id === categoryId);
    const defaultSize = selectedCat && isNoSizeCategory(selectedCat.slug) ? "Unique" : "M";
    const prefix = slug ? slug.toUpperCase() : "PROD";
    const newSku = `${prefix}-${defaultSize}-${Date.now().toString().slice(-4)}`;

    setVariants((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        size: defaultSize,
        color: "Noir",
        sku: newSku,
        stock: 5,
        price: "",
      },
    ]);
  };

  const updateVariant = (
    tempId: string,
    field: keyof VariantDraft,
    val: string | number
  ) => {
    setVariants((prev) =>
      prev.map((v) => (v.tempId === tempId ? { ...v, [field]: val } : v))
    );
  };

  const removeVariant = (tempId: string) => {
    if (variants.length <= 1) {
      alert("Le produit doit posséder au moins une déclinaison.");
      return;
    }
    const target = variants.find((v) => v.tempId === tempId);
    if (target?.id) {
      setDeletedVariantIds((prev) => [...prev, target.id!]);
    }
    setVariants((prev) => prev.filter((v) => v.tempId !== tempId));
  };

  // Image upload
  const handleImageFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    setErrorMessage(null);

    try {
      const newDrafts: ImageDraft[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 1. Validate size and type, and resize to max 1600px
        const resizedBlob = await resizeImageToMax1600(file);

        // 2. Upload to product-images bucket
        const ext = file.type === "image/png" ? "png" : "webp";
        const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
        const filePath = `products/${productId}/${Date.now()}_${i}_${cleanName}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("product-images")
          .upload(filePath, resizedBlob, {
            contentType: resizedBlob.type,
            upsert: true,
          });

        if (uploadErr) throw uploadErr;

        // 3. Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("product-images").getPublicUrl(filePath);

        newDrafts.push({
          tempId: crypto.randomUUID(),
          url: publicUrl,
          alt_text: name || file.name,
          sort_order: images.length + i,
          is_primary: images.length === 0 && i === 0,
        });
      }

      setImages((prev) => {
        const combined = [...prev, ...newDrafts];
        // If none is primary, make first primary
        if (!combined.some((img) => img.is_primary) && combined.length > 0) {
          combined[0].is_primary = true;
        }
        return combined;
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'envoi d'image";
      setErrorMessage(msg);
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  };

  const setPrimaryImage = (tempId: string) => {
    setImages((prev) =>
      prev.map((img) => ({
        ...img,
        is_primary: img.tempId === tempId,
      }))
    );
  };

  const removeImage = (tempId: string) => {
    const target = images.find((img) => img.tempId === tempId);
    if (target?.id) {
      setDeletedImageIds((prev) => [...prev, target.id!]);
    }
    setImages((prev) => {
      const filtered = prev.filter((img) => img.tempId !== tempId);
      if (target?.is_primary && filtered.length > 0) {
        filtered[0].is_primary = true;
      }
      return filtered;
    });
  };

  // Archive / unarchive product logic
  const handleToggleArchive = async () => {
    if (!isEditing) {
      setVisible(!visible);
      return;
    }
    const nextArchived = visible; // if currently visible, next is archived
    const confirmMsg = nextArchived
      ? "Archiver ce produit ? Il sera masqué de la boutique."
      : "Restaurer ce produit ? Il redeviendra visible en boutique.";
    if (!window.confirm(confirmMsg)) return;

    try {
      const { error: err } = await supabase
        .from("products")
        .update({ is_archived: nextArchived })
        .eq("id", productId);
      if (err) throw err;
      setVisible(!nextArchived);
      setSuccessMessage(nextArchived ? "Produit archivé." : "Produit restauré.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur";
      setErrorMessage(msg);
    }
  };

  // Save product, variants, images
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setFormErrors({});

    // 1. Validate product with Zod
    const validationResult = productFormSchema.safeParse({
      name,
      slug,
      description,
      category_id: categoryId || null,
      price: price ? parseInt(price, 10) : undefined,
      compare_at_price: compareAtPrice ? parseInt(compareAtPrice, 10) : null,
      visible,
      is_featured: isFeatured,
    });

    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      for (const issue of validationResult.error.issues) {
        if (issue.path[0]) {
          errors[issue.path[0].toString()] = issue.message;
        }
      }
      setFormErrors(errors);
      setErrorMessage("Veuillez corriger les erreurs dans le formulaire.");
      return;
    }

    // 2. Validate variants
    if (variants.length === 0) {
      setErrorMessage("Veuillez configurer au moins une variante.");
      return;
    }

    const skus = new Set<string>();
    for (const v of variants) {
      if (!v.sku.trim()) {
        setErrorMessage("Chaque variante doit posséder un SKU unique.");
        return;
      }
      if (skus.has(v.sku.trim().toUpperCase())) {
        setErrorMessage(`Le SKU « ${v.sku} » est utilisé plusieurs fois. Chaque SKU doit être unique.`);
        return;
      }
      skus.add(v.sku.trim().toUpperCase());
      if (v.stock < 0) {
        setErrorMessage("Le stock ne peut pas être négatif.");
        return;
      }
    }

    setSaving(true);
    try {
      const validData = validationResult.data;

      // Product payload
      const productPayload = {
        name: validData.name,
        slug: validData.slug,
        description: validData.description || null,
        category_id: validData.category_id || null,
        price: validData.price,
        compare_at_price: validData.compare_at_price,
        is_archived: !validData.visible, // Archiving
        is_featured: validData.is_featured,
      };

      if (isEditing) {
        const { error: updateErr } = await supabase
          .from("products")
          .update(productPayload)
          .eq("id", productId);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from("products")
          .insert({ id: productId, ...productPayload });
        if (insertErr) throw insertErr;
      }

      // Sync variants
      if (deletedVariantIds.length > 0) {
        await supabase
          .from("product_variants")
          .delete()
          .in("id", deletedVariantIds);
      }

      for (const v of variants) {
        const variantPayload = {
          product_id: productId,
          size: v.size.trim() || null,
          color: v.color.trim() || null,
          sku: v.sku.trim().toUpperCase(),
          stock: Number(v.stock) || 0,
          price: v.price.trim() ? parseInt(v.price, 10) : null,
          currency: "XOF",
        };

        if (v.id) {
          const { error: varErr } = await supabase
            .from("product_variants")
            .update(variantPayload)
            .eq("id", v.id);
          if (varErr) throw varErr;
        } else {
          const { error: varErr } = await supabase
            .from("product_variants")
            .insert(variantPayload);
          if (varErr) throw varErr;
        }
      }

      // Sync images
      if (deletedImageIds.length > 0) {
        await supabase
          .from("product_images")
          .delete()
          .in("id", deletedImageIds);
      }

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        const imagePayload = {
          product_id: productId,
          url: img.url,
          alt_text: img.alt_text.trim() || validData.name,
          sort_order: i,
          is_primary: Boolean(img.is_primary),
        };

        if (img.id) {
          await supabase
            .from("product_images")
            .update(imagePayload)
            .eq("id", img.id);
        } else {
          await supabase
            .from("product_images")
            .insert(imagePayload);
        }
      }

      setSuccessMessage("Produit enregistré avec succès !");
      setTimeout(() => {
        navigate("/admin/produits");
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "var(--space-8)", color: "var(--color-neutral-400)" }}>
        Chargement du produit…
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Link
            to="/admin/produits"
            className={styles.backBtn}
            title="Retour à la liste des produits"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className={styles.title}>
              {isEditing ? `Modifier : ${name || "Produit"}` : "Nouveau produit"}
            </h1>
            <span style={{ fontSize: "0.8125rem", color: "var(--color-neutral-400)" }}>
              {isEditing ? `ID : ${productId}` : "Création d'un nouvel article"}
            </span>
          </div>
        </div>

        <div className={styles.headerActions}>
          {isEditing && (
            visible ? (
              <button
                type="button"
                onClick={handleToggleArchive}
                className={styles.archiveBtn}
                title="Archiver le produit au lieu de le supprimer"
              >
                <Archive size={15} />
                <span>Archiver</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleToggleArchive}
                className={styles.unarchiveBtn}
                title="Restaurer le produit en boutique"
              >
                <RotateCcw size={15} />
                <span>Restaurer</span>
              </button>
            )
          )}

          <button
            type="submit"
            disabled={saving || uploadingImage}
            className={styles.primaryBtn}
          >
            <Save size={16} />
            <span>{saving ? "Enregistrement…" : "Enregistrer"}</span>
          </button>
        </div>
      </header>

      {errorMessage && <div className={styles.alertBox}>{errorMessage}</div>}
      {successMessage && <div className={styles.successBox}>{successMessage}</div>}

      <div className={styles.layoutGrid}>
        {/* Main Column */}
        <div className={styles.mainCol}>
          {/* Base Info */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Informations générales</h2>
              <span className={styles.cardSubtitle}>Détails essentiels du produit</span>
            </div>

            <div className={styles.formField}>
              <label className={styles.label} htmlFor="prod-name">
                Nom du produit *
              </label>
              <input
                id="prod-name"
                type="text"
                className={styles.input}
                placeholder="Ex : T-Shirt Signature Noir"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
              {formErrors.name && (
                <span className={styles.fieldError}>{formErrors.name}</span>
              )}
            </div>

            <div className={styles.formField}>
              <label className={styles.label} htmlFor="prod-slug">
                <span>Slug URL *</span>
                <button
                  type="button"
                  className={styles.smallActionBtn}
                  onClick={() => {
                    const s = slugify(name);
                    setSlug(s);
                    setManualSlug(false);
                  }}
                  title="Régénérer automatiquement le slug à partir du nom"
                >
                  <RefreshCw size={11} style={{ marginRight: 4 }} />
                  Auto-générer
                </button>
              </label>
              <input
                id="prod-slug"
                type="text"
                className={styles.input}
                placeholder="ex : t-shirt-signature-noir"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setManualSlug(true);
                }}
                required
              />
              {formErrors.slug && (
                <span className={styles.fieldError}>{formErrors.slug}</span>
              )}
            </div>

            <div className={styles.formField}>
              <label className={styles.label} htmlFor="prod-cat">
                Catégorie de produit
              </label>
              <select
                id="prod-cat"
                className={styles.select}
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
              >
                <option value="">Sélectionner une catégorie</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.formField}>
              <label className={styles.label} htmlFor="prod-desc">
                Description
              </label>
              <textarea
                id="prod-desc"
                className={styles.textarea}
                placeholder="Description du produit, matière, coupe, fabrication..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </section>

          {/* Pricing */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Tarification</h2>
              <span className={styles.cardSubtitle}>Montants en Francs CFA (XOF)</span>
            </div>

            <div className={styles.twoCols}>
              <div className={styles.formField}>
                <label className={styles.label} htmlFor="prod-price">
                  Prix de vente (XOF) *
                </label>
                <input
                  id="prod-price"
                  type="number"
                  min="0"
                  step="1"
                  className={styles.input}
                  placeholder="Ex : 25000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
                {formErrors.price && (
                  <span className={styles.fieldError}>{formErrors.price}</span>
                )}
              </div>

              <div className={styles.formField}>
                <label className={styles.label} htmlFor="prod-compare-price">
                  Prix barré compare_at_price (facultatif)
                </label>
                <input
                  id="prod-compare-price"
                  type="number"
                  min="0"
                  step="1"
                  className={styles.input}
                  placeholder="Ex : 35000 (doit être > prix)"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(e.target.value)}
                />
                {formErrors.compare_at_price && (
                  <span className={styles.fieldError}>{formErrors.compare_at_price}</span>
                )}
              </div>
            </div>
          </section>

          {/* Variants */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Variantes & Stock</h2>
                <span className={styles.cardSubtitle}>
                  Taille (« Unique » pour bijoux et lunettes), Couleur, SKU et Stock
                </span>
              </div>
              <button
                type="button"
                onClick={addVariant}
                className={styles.smallActionBtn}
                style={{ padding: "8px 12px" }}
              >
                <Plus size={14} style={{ marginRight: 4 }} />
                Ajouter une variante
              </button>
            </div>

            <table className={styles.variantsTable}>
              <thead>
                <tr>
                  <th style={{ width: "90px" }}>Taille</th>
                  <th style={{ width: "110px" }}>Couleur</th>
                  <th>SKU (Unique) *</th>
                  <th style={{ width: "90px" }}>Stock</th>
                  <th style={{ width: "120px" }}>Prix optionnel</th>
                  <th style={{ width: "40px" }}></th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.tempId}>
                    <td>
                      <input
                        type="text"
                        className={styles.tableInput}
                        value={v.size}
                        placeholder="M"
                        onChange={(e) =>
                          updateVariant(v.tempId, "size", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.tableInput}
                        value={v.color}
                        placeholder="Noir"
                        onChange={(e) =>
                          updateVariant(v.tempId, "color", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <input
                        type="text"
                        className={styles.tableInput}
                        value={v.sku}
                        placeholder="SKU-..."
                        onChange={(e) =>
                          updateVariant(v.tempId, "sku", e.target.value.toUpperCase())
                        }
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        className={styles.tableInput}
                        value={v.stock}
                        onChange={(e) =>
                          updateVariant(
                            v.tempId,
                            "stock",
                            parseInt(e.target.value, 10) || 0
                          )
                        }
                        required
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        className={styles.tableInput}
                        placeholder="Hérité"
                        value={v.price}
                        onChange={(e) =>
                          updateVariant(v.tempId, "price", e.target.value)
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => removeVariant(v.tempId)}
                        className={styles.delBtn}
                        title="Supprimer la variante"
                      >
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Images */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Images du produit</h2>
                <span className={styles.cardSubtitle}>
                  Envoi multiple vers product-images (JPEG, PNG, WEBP, max 5 Mo, redimensionné à 1600 px)
                </span>
              </div>
            </div>

            <label className={styles.uploadDropzone}>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageFiles}
                style={{ display: "none" }}
                disabled={uploadingImage}
              />
              <Upload size={32} className={styles.uploadIcon} />
              <div className={styles.uploadTitle}>
                {uploadingImage
                  ? "Optimisation et envoi des images en cours…"
                  : "Glissez ou cliquez pour sélectionner des images"}
              </div>
              <div className={styles.uploadHint}>
                Formats acceptés : JPG, PNG, WEBP • Max 5 Mo par image • Redimensionnement automatique à 1600 px
              </div>
            </label>

            {images.length > 0 && (
              <div className={styles.imagesGrid}>
                {images.map((img) => (
                  <div
                    key={img.tempId}
                    className={[
                      styles.imageCard,
                      img.is_primary ? styles.imageCardPrimary : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {img.is_primary && (
                      <span className={styles.primaryBadge}>Principale</span>
                    )}
                    <img
                      src={img.url}
                      alt={img.alt_text || "Image produit"}
                      className={styles.imageThumb}
                    />
                    <div className={styles.imageControls}>
                      <input
                        type="text"
                        placeholder="Texte alternatif (alt)"
                        className={styles.imageAltInput}
                        value={img.alt_text}
                        onChange={(e) => {
                          const val = e.target.value;
                          setImages((prev) =>
                            prev.map((i) =>
                              i.tempId === img.tempId ? { ...i, alt_text: val } : i
                            )
                          );
                        }}
                      />
                      <div className={styles.imageBtnRow}>
                        {!img.is_primary ? (
                          <button
                            type="button"
                            onClick={() => setPrimaryImage(img.tempId)}
                            className={styles.smallActionBtn}
                            title="Définir comme image principale"
                          >
                            <Star size={11} style={{ marginRight: 4 }} />
                            Définir principale
                          </button>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.6875rem",
                              color: "var(--color-brand)",
                              fontFamily: "var(--font-mono)",
                            }}
                          >
                            Image principale
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(img.tempId)}
                          className={styles.delBtn}
                          title="Supprimer l'image"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Side Column */}
        <div className={styles.sideCol}>
          {/* Status & Visibility */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Visibilité & Statut</h2>
            </div>

            <div className={styles.checkboxCard}>
              <input
                id="prod-visible"
                type="checkbox"
                checked={visible}
                onChange={(e) => setVisible(e.target.checked)}
                className={styles.checkbox}
              />
              <label htmlFor="prod-visible" className={styles.checkboxText}>
                <span className={styles.checkboxTitle}>Produit visible en ligne</span>
                <span className={styles.checkboxDesc}>
                  Si décoché, le produit est archivé et masqué du catalogue public.
                </span>
              </label>
            </div>

            <div className={styles.checkboxCard}>
              <input
                id="prod-featured"
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className={styles.checkbox}
              />
              <label htmlFor="prod-featured" className={styles.checkboxText}>
                <span className={styles.checkboxTitle}>Mis en avant (Featured)</span>
                <span className={styles.checkboxDesc}>
                  Affiche le produit dans la sélection vedette de l'accueil.
                </span>
              </label>
            </div>
          </section>

          {/* Quick Summary */}
          <section className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Récapitulatif</h2>
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--color-neutral-300)", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div>Déclinaisons : <strong>{variants.length}</strong></div>
              <div>Stock total : <strong>{variants.reduce((acc, v) => acc + (Number(v.stock) || 0), 0)}</strong> unités</div>
              <div>Photos : <strong>{images.length}</strong></div>
              <div>Statut : <strong style={{ color: visible ? "#4ade80" : "#f87171" }}>{visible ? "En ligne" : "Archivé"}</strong></div>
            </div>

            <button
              type="submit"
              disabled={saving || uploadingImage}
              className={styles.primaryBtn}
              style={{ width: "100%", justifyContent: "center", marginTop: "var(--space-3)" }}
            >
              <Save size={16} />
              <span>{saving ? "Enregistrement…" : "Enregistrer le produit"}</span>
            </button>
          </section>
        </div>
      </div>
    </form>
  );
}
