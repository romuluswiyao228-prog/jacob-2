import { useState, type ReactNode } from "react";
import {
  Button,
  Input,
  Select,
  Badge,
  ProductCard,
  Skeleton,
  Drawer,
  Breadcrumb,
  EmptyState,
  ErrorState,
} from "@/components/ui";
import styles from "./DesignSystemPage.module.css";

const sampleProduct = {
  id: "p1",
  name: "Hoodie Brut",
  reference: "JDJ-HD-001",
  price: 89.0,
  originalPrice: 120.0,
  image:
    "https://images.pexels.com/photos/8217425/pexels-photo-8217425.jpeg?auto=compress&cs=tinysrgb&w=600",
  imageAlt: "Hoodie streetwear noir",
  sizes: ["S", "M", "L", "XL"],
  badge: "sale" as const,
};

const sampleProductNew = {
  id: "p2",
  name: "Tee Brut",
  reference: "JDJ-TS-002",
  price: 35.0,
  image:
    "https://images.pexels.com/photos/8217425/pexels-photo-8217425.jpeg?auto=compress&cs=tinysrgb&w=600",
  sizes: ["S", "M", "L", "XL"],
  badge: "new" as const,
};

const sampleProductSoldout = {
  id: "p3",
  name: "Cap Brut",
  reference: "JDJ-CP-003",
  price: 25.0,
  image:
    "https://images.pexels.com/photos/8217425/pexels-photo-8217425.jpeg?auto=compress&cs=tinysrgb&w=600",
  sizes: ["S", "M", "L", "XL"],
  badge: "soldout" as const,
  isSoldOut: true,
};

const selectOptions = [
  { value: "xs", label: "XS" },
  { value: "s", label: "S" },
  { value: "m", label: "M" },
  { value: "l", label: "L" },
  { value: "xl", label: "XL" },
];

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  );
}

export default function DesignSystemPage() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | undefined>();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <h1 className={styles.title}>JACOB DE JESUS — Design System</h1>
          <p className={styles.subtitle}>
            Style streetwear : brut, net, sobre. Page interne de prévisualisation.
          </p>
        </div>
      </header>

      <main className={styles.main}>
        {/* === COULEURS === */}
        <Section title="Couleurs">
          <div className={styles.swatchGrid}>
            <div className={styles.swatch} style={{ background: "#0A0A0A" }}>
              <span className={styles.swatchLabelLight}>#0A0A0A</span>
              <span className={styles.swatchName}>Noir / Fond</span>
            </div>
            <div className={styles.swatch} style={{ background: "#FFFFFF", border: "1px solid #E5E5E5" }}>
              <span className={styles.swatchLabelDark}>#FFFFFF</span>
              <span className={styles.swatchName}>Blanc / Surface</span>
            </div>
            <div className={styles.swatch} style={{ background: "#6B6B6B" }}>
              <span className={styles.swatchLabelLight}>#6B6B6B</span>
              <span className={styles.swatchName}>Gris / Texte muet</span>
            </div>
            <div className={styles.swatch} style={{ background: "#E5E5E5" }}>
              <span className={styles.swatchLabelDark}>#E5E5E5</span>
              <span className={styles.swatchName}>Gris clair / Bordures</span>
            </div>
            <div className={styles.swatch} style={{ background: "#E10600" }}>
              <span className={styles.swatchLabelLight}>#E10600</span>
              <span className={styles.swatchName}>Accent rouge</span>
            </div>
          </div>
        </Section>

        {/* === TYPOGRAPHIE === */}
        <Section title="Typographie">
          <div className={styles.typeGrid}>
            <div className={styles.typeItem}>
              <p className={styles.typeLabel}>Anton — Titres</p>
              <p className={styles.typeSampleDisplay}>JACOB DE JESUS</p>
            </div>
            <div className={styles.typeItem}>
              <p className={styles.typeLabel}>Inter — Texte</p>
              <p className={styles.typeSampleBody}>
                Le streetwear est une attitude. Brut, net, sans compromis.
              </p>
            </div>
            <div className={styles.typeItem}>
              <p className={styles.typeLabel}>Space Mono — Prix, tailles, refs</p>
              <p className={styles.typeSampleMono}>89.00 € — JDJ-HD-001 — M</p>
            </div>
          </div>
        </Section>

        {/* === BUTTONS === */}
        <Section title="Boutons">
          <div className={styles.row}>
            <Button variant="primary">Acheter</Button>
            <Button variant="secondary">Voir</Button>
            <Button variant="outline">Filtrer</Button>
            <Button variant="ghost">Annuler</Button>
          </div>
          <div className={styles.row}>
            <Button variant="primary" size="sm">Small</Button>
            <Button variant="primary" size="md">Medium</Button>
            <Button variant="primary" size="lg">Large</Button>
          </div>
          <div className={styles.row}>
            <Button variant="primary" disabled>Désactivé</Button>
            <Button variant="primary" isLoading>Chargement</Button>
            <Button variant="primary" fullWidth={false}>Normal</Button>
            <Button variant="primary" fullWidth>Full width</Button>
          </div>
        </Section>

        {/* === INPUT === */}
        <Section title="Champs de saisie">
          <div className={styles.formGrid}>
            <Input label="Nom complet" placeholder="Jean Dupont" />
            <Input label="Avec hint" placeholder="exemple@email.com" hint="Format attendu : email" />
            <Input label="Avec erreur" placeholder="..." error="Ce champ est requis" />
            <Input label="Désactivé" placeholder="Non modifiable" disabled />
            <Input label="Focus" placeholder="Cliquez ici" defaultValue="" />
            <Select label="Taille" placeholder="Choisir" options={selectOptions} />
            <Select label="Avec erreur" options={selectOptions} error="Sélection requise" />
            <Select label="Désactivé" options={selectOptions} disabled />
          </div>
        </Section>

        {/* === BADGES === */}
        <Section title="Badges">
          <div className={styles.row}>
            <Badge variant="new">NOUVEAU</Badge>
            <Badge variant="sale">SOLDE</Badge>
            <Badge variant="soldout">ÉPUISÉ</Badge>
            <Badge variant="neutral">STREETWEAR</Badge>
          </div>
        </Section>

        {/* === PRODUCT CARDS === */}
        <Section title="Cartes produit">
          <div className={styles.cardGrid}>
            <ProductCard
              product={sampleProduct}
              selectedSize={selectedSize}
              onSizeSelect={(_, size) => setSelectedSize(size)}
            />
            <ProductCard product={sampleProductNew} />
            <ProductCard product={sampleProductSoldout} />
          </div>
        </Section>

        {/* === SKELETON === */}
        <Section title="Skeletons (chargement)">
          <div className={styles.cardGrid}>
            <div className={styles.skeletonCard}>
              <Skeleton variant="rect" height="300px" />
              <div className={styles.skeletonBody}>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="text" width="30%" />
              </div>
            </div>
            <div className={styles.skeletonCard}>
              <Skeleton variant="rect" height="300px" />
              <div className={styles.skeletonBody}>
                <Skeleton variant="text" width="60%" />
                <Skeleton variant="text" width="40%" />
                <Skeleton variant="text" width="30%" />
              </div>
            </div>
          </div>
        </Section>

        {/* === BREADCRUMB === */}
        <Section title="Fil d'ariane">
          <Breadcrumb
            items={[
              { label: "Accueil", href: "/" },
              { label: "Boutique", href: "/boutique" },
              { label: "Hoodie Brut", href: "/produit/hoodie-brut" },
              { label: "Page actuelle" },
            ]}
          />
        </Section>

        {/* === DRAWER === */}
        <Section title="Drawer">
          <Button onClick={() => setDrawerOpen(true)}>Ouvrir le drawer</Button>
          <Drawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            title="Filtres"
          >
            <p className={styles.drawerText}>
              Contenu du drawer. Clique à l'extérieur ou sur × pour fermer.
            </p>
            <div className={styles.row} style={{ marginTop: "16px" }}>
              <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)}>
                Fermer
              </Button>
            </div>
          </Drawer>
        </Section>

        {/* === EMPTY STATE === */}
        <Section title="État vide">
          <EmptyState
            title="Aucun produit"
            description="La collection est vide pour le moment. Revenez bientôt."
          />
        </Section>

        {/* === ERROR STATE === */}
        <Section title="État d'erreur">
          <ErrorState
            title="ERREUR DE CHARGEMENT"
            message="Impossible de charger les produits. Vérifiez votre connexion."
            action={<Button variant="primary" size="sm">Réessayer</Button>}
          />
        </Section>
      </main>

      <footer className={styles.footer}>
        <p className={styles.footerText}>
          JACOB DE JESUS — Design System v1 — Page de prévisualisation interne
        </p>
      </footer>
    </div>
  );
}
