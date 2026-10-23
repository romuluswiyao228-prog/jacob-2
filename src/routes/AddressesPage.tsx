import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import {
  Button,
  Skeleton,
  EmptyState,
  ErrorState,
} from "@/components/ui";
import {
  AuthForm,
  AuthField,
  AuthAlert,
  AuthSubmit,
} from "@/components/auth";
import { AccountLayout } from "@/components/account/AccountLayout";
import styles from "./AddressesPage.module.css";

export interface Address {
  id: string;
  user_id: string;
  label: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postal_code: string | null;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

const addressSchema = z.object({
  label: z.string().trim().min(1, "Le libellé est obligatoire (ex. Domicile, Bureau)."),
  first_name: z.string().trim().min(1, "Le prénom est obligatoire."),
  last_name: z.string().trim().min(1, "Le nom est obligatoire."),
  phone: z.string().trim().optional(),
  line1: z.string().trim().min(2, "L'adresse est obligatoire."),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(1, "La ville est obligatoire."),
  region: z.string().trim().optional(),
  postal_code: z.string().trim().optional(),
  country: z.string().trim().min(1, "Le pays est obligatoire."),
  is_default: z.boolean(),
});

type AddressFormData = z.infer<typeof addressSchema>;

export default function AddressesPage() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: "",
      first_name: "",
      last_name: "",
      phone: "",
      line1: "",
      line2: "",
      city: "",
      region: "",
      postal_code: "",
      country: "Togo",
      is_default: false,
    },
  });

  const loadAddresses = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from("addresses")
        .select("*")
        .eq("user_id", user.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      setAddresses(data ?? []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de chargement des adresses.";
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  const openAddModal = () => {
    setEditingAddress(null);
    reset({
      label: "Domicile",
      first_name: "",
      last_name: "",
      phone: "",
      line1: "",
      line2: "",
      city: "Lomé",
      region: "",
      postal_code: "",
      country: "Togo",
      is_default: addresses.length === 0,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (addr: Address) => {
    setEditingAddress(addr);
    reset({
      label: addr.label || "Adresse",
      first_name: addr.first_name,
      last_name: addr.last_name,
      phone: addr.phone || "",
      line1: addr.line1,
      line2: addr.line2 || "",
      city: addr.city,
      region: addr.region || "",
      postal_code: addr.postal_code || "",
      country: addr.country || "Togo",
      is_default: addr.is_default,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const onSubmit = async (data: AddressFormData) => {
    if (!user) return;
    setFormError(null);

    try {
      // If setting as default, remove default flag from others
      if (data.is_default) {
        await supabase
          .from("addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);
      }

      if (editingAddress) {
        // Update
        const { error: updateErr } = await supabase
          .from("addresses")
          .update({
            label: data.label,
            first_name: data.first_name,
            last_name: data.last_name,
            phone: data.phone || null,
            line1: data.line1,
            line2: data.line2 || null,
            city: data.city,
            region: data.region || null,
            postal_code: data.postal_code || null,
            country: data.country,
            is_default: data.is_default,
            updated_at: new Date().toISOString(),
          })
          .eq("id", editingAddress.id)
          .eq("user_id", user.id);

        if (updateErr) throw updateErr;
      } else {
        // Insert
        const { error: insertErr } = await supabase.from("addresses").insert({
          user_id: user.id,
          label: data.label,
          first_name: data.first_name,
          last_name: data.last_name,
          phone: data.phone || null,
          line1: data.line1,
          line2: data.line2 || null,
          city: data.city,
          region: data.region || null,
          postal_code: data.postal_code || null,
          country: data.country,
          is_default: data.is_default,
        });

        if (insertErr) throw insertErr;
      }

      setIsModalOpen(false);
      await loadAddresses();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement.";
      setFormError(msg);
    }
  };

  const handleDelete = async (addrId: string) => {
    if (!confirm("Voulez-vous vraiment supprimer cette adresse ?")) return;
    try {
      const { error: delErr } = await supabase
        .from("addresses")
        .delete()
        .eq("id", addrId)
        .eq("user_id", user!.id);

      if (delErr) throw delErr;
      setAddresses((prev) => prev.filter((a) => a.id !== addrId));
    } catch {
      alert("Impossible de supprimer cette adresse.");
    }
  };

  const handleSetDefault = async (addrId: string) => {
    if (!user) return;
    try {
      await supabase
        .from("addresses")
        .update({ is_default: false })
        .eq("user_id", user.id);

      await supabase
        .from("addresses")
        .update({ is_default: true })
        .eq("id", addrId)
        .eq("user_id", user.id);

      await loadAddresses();
    } catch {
      alert("Erreur lors de la mise à jour de l'adresse par défaut.");
    }
  };

  return (
    <AccountLayout
      title="Mes adresses"
      subtitle={`${addresses.length} adresse${addresses.length > 1 ? "s" : ""} enregistrée${addresses.length > 1 ? "s" : ""}`}
    >
      <div className={styles.topActions}>
        <Button variant="primary" size="sm" onClick={openAddModal}>
          <Plus size={16} />
          <span>Ajouter une adresse</span>
        </Button>
      </div>

      {isLoading ? (
        <div className={styles.grid}>
          {[1, 2].map((i) => (
            <div
              key={i}
              style={{
                background: "var(--color-surface)",
                border: "var(--border-width) solid var(--color-border)",
                padding: "var(--space-5)",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <Skeleton variant="text" width="40%" height="20px" />
              <Skeleton variant="text" width="70%" />
              <Skeleton variant="text" width="50%" />
              <Skeleton variant="rect" width="100%" height="32px" />
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState
          title="Impossible de charger vos adresses"
          message={error}
          action={
            <Button variant="outline" size="sm" onClick={loadAddresses}>
              Réessayer
            </Button>
          }
        />
      ) : addresses.length === 0 ? (
        <EmptyState
          title="Aucune adresse enregistrée"
          description="Enregistrez votre adresse de livraison pour accélérer la validation de vos commandes."
          action={
            <Button variant="primary" size="md" onClick={openAddModal}>
              <Plus size={16} />
              <span>Ajouter une première adresse</span>
            </Button>
          }
        />
      ) : (
        <div className={styles.grid}>
          {addresses.map((addr) => (
            <article key={addr.id} className={styles.addressCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardLabel}>{addr.label || "Adresse"}</span>
                {addr.is_default && (
                  <span className={styles.defaultBadge}>Par défaut</span>
                )}
              </div>

              <div className={styles.cardBody}>
                <h3 className={styles.cardName}>
                  {addr.first_name} {addr.last_name}
                </h3>
                <p className={styles.cardText}>{addr.line1}</p>
                {addr.line2 && <p className={styles.cardText}>{addr.line2}</p>}
                <p className={styles.cardText}>
                  {[addr.postal_code, addr.city, addr.region, addr.country]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                {addr.phone && <p className={styles.cardPhone}>Tél : {addr.phone}</p>}
              </div>

              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => openEditModal(addr)}
                >
                  Modifier
                </button>
                <button
                  type="button"
                  className={[styles.actionBtn, styles.deleteBtn].join(" ")}
                  onClick={() => handleDelete(addr.id)}
                >
                  Supprimer
                </button>
                {!addr.is_default && (
                  <button
                    type="button"
                    className={[styles.actionBtn, styles.setDefaultBtn].join(" ")}
                    onClick={() => handleSetDefault(addr.id)}
                  >
                    Définir par défaut
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Modal Ajout / Modification */}
      {isModalOpen && (
        <div
          className={styles.formModalBackdrop}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className={styles.formModalContent}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingAddress ? "Modifier l'adresse" : "Nouvelle adresse"}
              </h2>
              <button
                type="button"
                className={styles.closeModalBtn}
                onClick={() => setIsModalOpen(false)}
                aria-label="Fermer"
              >
                <X size={20} />
              </button>
            </div>

            <AuthForm onSubmit={handleSubmit(onSubmit)} noValidate>
              {formError && <AuthAlert>{formError}</AuthAlert>}

              <AuthField
                label="Libellé de l'adresse (ex. Domicile, Bureau, Famille)"
                type="text"
                error={errors.label?.message}
                {...register("label")}
              />

              <div className={styles.formGrid2}>
                <AuthField
                  label="Prénom"
                  type="text"
                  autoComplete="given-name"
                  error={errors.first_name?.message}
                  {...register("first_name")}
                />
                <AuthField
                  label="Nom"
                  type="text"
                  autoComplete="family-name"
                  error={errors.last_name?.message}
                  {...register("last_name")}
                />
              </div>

              <AuthField
                label="Numéro de téléphone"
                type="tel"
                autoComplete="tel"
                hint="Pour le livreur lors de la remise de votre colis."
                error={errors.phone?.message}
                {...register("phone")}
              />

              <AuthField
                label="Adresse (rue, quartier, repère)"
                type="text"
                autoComplete="address-line1"
                error={errors.line1?.message}
                {...register("line1")}
              />

              <AuthField
                label="Complément d'adresse (bâtiment, étage, porte - facultatif)"
                type="text"
                autoComplete="address-line2"
                error={errors.line2?.message}
                {...register("line2")}
              />

              <div className={styles.formGrid2}>
                <AuthField
                  label="Ville"
                  type="text"
                  autoComplete="address-level2"
                  error={errors.city?.message}
                  {...register("city")}
                />
                <AuthField
                  label="Région / Préfecture (facultatif)"
                  type="text"
                  autoComplete="address-level1"
                  error={errors.region?.message}
                  {...register("region")}
                />
              </div>

              <div className={styles.formGrid2}>
                <AuthField
                  label="Code postal (facultatif)"
                  type="text"
                  autoComplete="postal-code"
                  error={errors.postal_code?.message}
                  {...register("postal_code")}
                />
                <AuthField
                  label="Pays"
                  type="text"
                  autoComplete="country-name"
                  error={errors.country?.message}
                  {...register("country")}
                />
              </div>

              <div className={styles.checkboxField}>
                <input
                  type="checkbox"
                  id="addr_is_default"
                  className={styles.checkboxInput}
                  {...register("is_default")}
                />
                <label htmlFor="addr_is_default" className={styles.checkboxLabel}>
                  Définir comme adresse de livraison par défaut
                </label>
              </div>

              <div className={styles.formButtons}>
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={() => setIsModalOpen(false)}
                  style={{ flex: 1 }}
                >
                  Annuler
                </Button>
                <div style={{ flex: 1 }}>
                  <AuthSubmit
                    loading={isSubmitting}
                    loadingLabel="Enregistrement…"
                  >
                    {editingAddress ? "Mettre à jour" : "Enregistrer l'adresse"}
                  </AuthSubmit>
                </div>
              </div>
            </AuthForm>
          </div>
        </div>
      )}
    </AccountLayout>
  );
}
