import { useEffect } from "react";

export interface SeoProps {
  title: string;
  description?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  canonicalUrl?: string;
  jsonLd?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const DEFAULT_DESCRIPTION =
  "JACOB DE JESUS — Marque streetwear contemporaine. Pièces exclusives, finitions haut de gamme et esprit brut.";
const DEFAULT_IMAGE = "/favicon.svg";

function setMetaTag(selector: string, attrName: string, attrValue: string, content: string) {
  let element = document.querySelector(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attrName, attrValue);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

export function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  ogImage = DEFAULT_IMAGE,
  ogType = "website",
  canonicalUrl,
  jsonLd,
}: SeoProps) {
  useEffect(() => {
    // 1. Title
    const formattedTitle = title.includes("JACOB DE JESUS")
      ? title
      : `${title} | JACOB DE JESUS`;
    document.title = formattedTitle;

    // 2. Meta description
    setMetaTag('meta[name="description"]', "name", "description", description);

    // 3. Open Graph
    setMetaTag('meta[property="og:title"]', "property", "og:title", formattedTitle);
    setMetaTag('meta[property="og:description"]', "property", "og:description", description);
    setMetaTag('meta[property="og:type"]', "property", "og:type", ogType);
    setMetaTag('meta[property="og:image"]', "property", "og:image", ogImage);
    const url = canonicalUrl || (typeof window !== "undefined" ? window.location.href : "");
    if (url) {
      setMetaTag('meta[property="og:url"]', "property", "og:url", url);
    }

    // 4. Twitter Card
    setMetaTag('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMetaTag('meta[name="twitter:title"]', "name", "twitter:title", formattedTitle);
    setMetaTag('meta[name="twitter:description"]', "name", "twitter:description", description);
    setMetaTag('meta[name="twitter:image"]', "name", "twitter:image", ogImage);

    // 5. JSON-LD structured data
    let scriptTag: HTMLScriptElement | null = null;
    if (jsonLd) {
      const scriptId = "dynamic-json-ld";
      scriptTag = document.getElementById(scriptId) as HTMLScriptElement | null;
      if (!scriptTag) {
        scriptTag = document.createElement("script");
        scriptTag.id = scriptId;
        scriptTag.type = "application/ld+json";
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(jsonLd);
    }

    return () => {
      // Clean up jsonLd on unmount if specific to page
      if (jsonLd) {
        const tag = document.getElementById("dynamic-json-ld");
        if (tag) {
          tag.remove();
        }
      }
    };
  }, [title, description, ogImage, ogType, canonicalUrl, jsonLd]);

  return null;
}
