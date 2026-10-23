import { useLocation } from "react-router-dom";
import { useStoreSettings } from "@/lib/hooks";
import { Breadcrumb } from "@/components/ui";
import { SEO } from "@/components/SEO";
import styles from "./LegalPage.module.css";

interface LegalSection {
  title: string;
  description: string;
}

const TEMPLATES: Record<
  "cgv" | "privacy" | "legal" | "returns",
  { pageTitle: string; sections: LegalSection[] }
> = {
  cgv: {
    pageTitle: "Conditions Générales de Vente (CGV)",
    sections: [
      {
        title: "1. Préambule et Présentation de la Maison",
        description:
          "Présentation de la marque JACOB DE JESUS, champ d'application des conditions générales et acceptation par le client lors de toute commande.",
      },
      {
        title: "2. Articles et Disponibilité des Stocks",
        description:
          "Caractéristiques des pièces de prêt-à-porter, bijoux et accessoires streetwear, éditions limitées et gestion des ruptures temporaires.",
      },
      {
        title: "3. Prix et Modalités de Facturation",
        description:
          "Tarification en Francs CFA (XOF), exonérations et taxes applicables, frais de transport facturés en sus selon la zone de livraison.",
      },
      {
        title: "4. Enregistrement et Confirmation de Commande",
        description:
          "Processus de passation de commande sur le site, validation du panier et émission du numéro de commande officiel.",
      },
      {
        title: "5. Modes de Règlement Sécurisés",
        description:
          "Paiement à la livraison (Cash on Delivery) et solutions de paiement mobile locales autorisées.",
      },
      {
        title: "6. Modalités de Livraison et Délais",
        description:
          "Expédition à Lomé, dans les préfectures du Togo et dans la sous-région, délais indicatifs d'acheminement et transfert des risques.",
      },
      {
        title: "7. Droit de Rétractation et Retours",
        description:
          "Délai légal de rétractation de 14 jours, état impératif des articles retournés (étiquette et emballage d'origine non altérés).",
      },
      {
        title: "8. Droit Applicable et Résolution des Litiges",
        description:
          "Législation togolaise applicable et juridictions compétentes en cas de différend non résolu à l'amiable.",
      },
    ],
  },
  privacy: {
    pageTitle: "Politique de Confidentialité",
    sections: [
      {
        title: "1. Responsable du Traitement des Données",
        description:
          "Identité et coordonnées de la maison JACOB DE JESUS pour la protection des données personnelles.",
      },
      {
        title: "2. Données Personnelles Collectées",
        description:
          "Informations collectées lors de la navigation, création de compte, passation de commande et prise de contact (nom, e-mail, téléphone, adresse).",
      },
      {
        title: "3. Finalités et Utilisation des Informations",
        description:
          "Traitement des commandes, acheminement des colis, communication sur les livraisons et relation client exclusive.",
      },
      {
        title: "4. Sécurité et Conservation des Données",
        description:
          "Mesures techniques de protection de la base de données PostgreSQL, chiffrement des accès et absence de revente de données à des tiers.",
      },
      {
        title: "5. Vos Droits (Accès, Rectification, Suppression)",
        description:
          "Modalités d'exercice de vos droits d'accès ou d'effacement de vos données personnelles sur simple demande via notre formulaire de contact.",
      },
    ],
  },
  legal: {
    pageTitle: "Mentions Légales",
    sections: [
      {
        title: "1. Éditeur de la Plateforme",
        description:
          "Raison sociale, forme juridique, siège social, numéro d'enregistrement au registre du commerce et du crédit mobilier.",
      },
      {
        title: "2. Direction de la Publication",
        description:
          "Nom du directeur de publication et représentant légal de la marque JACOB DE JESUS.",
      },
      {
        title: "3. Hébergement du Service",
        description:
          "Informations techniques sur l'infrastructure d'hébergement web et les serveurs de base de données.",
      },
      {
        title: "4. Propriété Intellectuelle et Droits d'Auteur",
        description:
          "Protection intégrale de la marque déposée JACOB DE JESUS, des créations vestimentaires, photographies, logotypes et éléments graphiques du site.",
      },
    ],
  },
  returns: {
    pageTitle: "Politique de Retours et Échanges",
    sections: [
      {
        title: "1. Délais d'Échange et de Retour",
        description:
          "Possibilité de demander un échange de taille ou un retour dans un délai de 14 jours calendaires à compter de la réception de votre colis.",
      },
      {
        title: "2. Conditions d'Éligibilité des Pièces",
        description:
          "Les vêtements et accessoires doivent être rigoureusement neufs, non portés, non lavés, avec toutes leurs étiquettes d'origine intactes.",
      },
      {
        title: "3. Procédure de Prise en Charge",
        description:
          "Contact préalable via le formulaire ou WhatsApp officiel avec votre numéro de commande pour validation du bon de retour.",
      },
      {
        title: "4. Modalités de Remboursement ou d'Avoir",
        description:
          "Délai de remboursement ou émission d'un avoir boutique après inspection physique de la pièce en atelier.",
      },
    ],
  },
};

export default function LegalPage() {
  const location = useLocation();
  const { data: settings } = useStoreSettings();
  const path = location.pathname.toLowerCase();

  let type: "cgv" | "privacy" | "legal" | "returns" = "cgv";
  if (path.includes("confidentialite")) {
    type = "privacy";
  } else if (path.includes("mention")) {
    type = "legal";
  } else if (path.includes("retour")) {
    type = "returns";
  }

  const rawText = (() => {
    switch (type) {
      case "cgv":
        return settings?.cgv?.trim() || "";
      case "privacy":
        return settings?.privacy_policy?.trim() || "";
      case "legal":
        return settings?.legal_mentions?.trim() || "";
      case "returns":
        return settings?.returns_policy?.trim() || "";
      default:
        return "";
    }
  })();

  const template = TEMPLATES[type];
  const isEmpty = !rawText || rawText.length === 0;

  // Render text safely without dangerouslySetInnerHTML
  const renderTextContent = (text: string) => {
    const blocks = text.split(/\n\s*\n/);
    return blocks.map((block, idx) => {
      const trimmed = block.trim();
      if (!trimmed) return null;

      // Check if block looks like a heading (e.g. starts with "Article", "1.", "#", etc.)
      const isHeading =
        trimmed.startsWith("#") ||
        /^article\s+\d+/i.test(trimmed) ||
        /^\d+\.\s+[A-ZÀ-Ÿ]/.test(trimmed);

      if (isHeading) {
        const cleanHeading = trimmed.replace(/^#+\s*/, "");
        return (
          <h2 key={idx} className={styles.sectionHeading}>
            {cleanHeading}
          </h2>
        );
      }

      // Check if block is a bulleted list
      if (trimmed.includes("\n- ") || trimmed.startsWith("- ")) {
        const lines = trimmed.split("\n").map((l) => l.trim().replace(/^-\s*/, ""));
        return (
          <ul key={idx} className={styles.bulletList}>
            {lines.map((line, lineIdx) => (
              <li key={lineIdx} className={styles.bulletItem}>
                {line}
              </li>
            ))}
          </ul>
        );
      }

      return (
        <p key={idx} className={styles.paragraph}>
          {trimmed}
        </p>
      );
    });
  };

  return (
    <div className={styles.page}>
      <SEO
        title={template.pageTitle}
        description={`Consultez les ${template.pageTitle.toLowerCase()} de la marque JACOB DE JESUS.`}
      />
      <Breadcrumb
        items={[
          { label: "Accueil", href: "/" },
          { label: template.pageTitle },
        ]}
        style={{ marginBottom: "var(--space-4)" }}
      />
      <header className={styles.header}>
        <h1 className={styles.title}>{template.pageTitle}</h1>
        <span className={styles.lastUpdate}>
          Maison JACOB DE JESUS • Informations Légales
        </span>
      </header>

      {isEmpty ? (
        <>
          <div className={styles.toCompleteNotice}>
            <span className={styles.noticeTitle}>
              DOCUMENT À COMPLÉTER PAR LE PROPRIÉTAIRE
            </span>
            <span className={styles.noticeDesc}>
              Ce modèle présente la structure officielle requise. Vous pouvez personnaliser
              l'intégralité de ces dispositions dans l'espace administration (menu Réglages).
            </span>
          </div>

          <div className={styles.content}>
            {template.sections.map((sec, i) => (
              <div key={i} className={styles.toCompleteSection}>
                <h2 className={styles.sectionHeading}>{sec.title}</h2>
                <p className={styles.paragraph}>{sec.description}</p>
                <span className={styles.toCompleteTag}>
                  [Section à renseigner dans /admin/reglages]
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.content}>{renderTextContent(rawText)}</div>
      )}
    </div>
  );
}
