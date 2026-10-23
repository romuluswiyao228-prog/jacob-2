import { describe, it, expect } from "vitest";
import { sortSizes, isNoSizeCategory } from "@/lib/sizes";

interface MockProduct {
  id: string;
  name: string;
  slug: string;
  category_id: string;
  price: number;
  created_at: string;
  sizes: string[];
}

function filterAndSortProducts(
  products: MockProduct[],
  options: {
    category_id?: string;
    size?: string;
    search?: string;
    sort?: "newest" | "price_asc" | "price_desc";
  }
): MockProduct[] {
  let list = [...products];

  if (options.category_id) {
    list = list.filter((p) => p.category_id === options.category_id);
  }

  if (options.size) {
    list = list.filter((p) => p.sizes.includes(options.size!));
  }

  if (options.search) {
    const q = options.search.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
    );
  }

  if (options.sort === "price_asc") {
    list.sort((a, b) => a.price - b.price);
  } else if (options.sort === "price_desc") {
    list.sort((a, b) => b.price - a.price);
  } else {
    // "newest"
    list.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  return list;
}

describe("Filtres du catalogue et utilitaires de tri", () => {
  const sampleProducts: MockProduct[] = [
    {
      id: "1",
      name: "Hoodie Heavy Black",
      slug: "hoodie-heavy-black",
      category_id: "cat_hoodies",
      price: 45000,
      created_at: "2026-01-01T10:00:00Z",
      sizes: ["S", "M", "L", "XL"],
    },
    {
      id: "2",
      name: "T-Shirt Boxy White",
      slug: "tshirt-boxy-white",
      category_id: "cat_tshirts",
      price: 25000,
      created_at: "2026-02-01T10:00:00Z",
      sizes: ["M", "L"],
    },
    {
      id: "3",
      name: "Cargo Pants Olive",
      slug: "cargo-pants-olive",
      category_id: "cat_pants",
      price: 55000,
      created_at: "2026-03-01T10:00:00Z",
      sizes: ["M", "L", "XL"],
    },
    {
      id: "4",
      name: "Bague Argent 925",
      slug: "bague-argent-925",
      category_id: "cat_bijoux",
      price: 35000,
      created_at: "2026-04-01T10:00:00Z",
      sizes: ["Unique"],
    },
  ];

  it("filtre les produits par catégorie", () => {
    const res = filterAndSortProducts(sampleProducts, {
      category_id: "cat_hoodies",
    });
    expect(res).toHaveLength(1);
    expect(res[0].name).toBe("Hoodie Heavy Black");
  });

  it("filtre les produits par taille disponible", () => {
    const res = filterAndSortProducts(sampleProducts, { size: "XL" });
    expect(res).toHaveLength(2);
    expect(res.map((p) => p.name)).toEqual([
      "Cargo Pants Olive",
      "Hoodie Heavy Black",
    ]);
  });

  it("filtre les produits par recherche textuelle", () => {
    const res = filterAndSortProducts(sampleProducts, { search: "boxy" });
    expect(res).toHaveLength(1);
    expect(res[0].slug).toBe("tshirt-boxy-white");
  });

  it("trie les produits par prix croissant", () => {
    const res = filterAndSortProducts(sampleProducts, { sort: "price_asc" });
    expect(res.map((p) => p.price)).toEqual([25000, 35000, 45000, 55000]);
  });

  it("trie les produits par prix décroissant", () => {
    const res = filterAndSortProducts(sampleProducts, { sort: "price_desc" });
    expect(res.map((p) => p.price)).toEqual([55000, 45000, 35000, 25000]);
  });

  it("trie les produits par nouveauté (date décroissante)", () => {
    const res = filterAndSortProducts(sampleProducts, { sort: "newest" });
    expect(res[0].name).toBe("Bague Argent 925");
    expect(res[3].name).toBe("Hoodie Heavy Black");
  });

  it("combine plusieurs filtres (catégorie + taille)", () => {
    const res = filterAndSortProducts(sampleProducts, {
      category_id: "cat_hoodies",
      size: "M",
    });
    expect(res).toHaveLength(1);
    expect(res[0].name).toBe("Hoodie Heavy Black");
  });

  it("identifie les catégories sans taille (Bijoux et Lunettes)", () => {
    expect(isNoSizeCategory("bijoux")).toBe(true);
    expect(isNoSizeCategory("Bijoux")).toBe(true);
    expect(isNoSizeCategory("lunettes")).toBe(true);
    expect(isNoSizeCategory("vetements")).toBe(false);
    expect(isNoSizeCategory("")).toBe(false);
  });

  it("trie les tailles vestimentaires selon l'ordre standard (XS, S, M, L, XL...)", () => {
    const sizes = ["XL", "S", "M", "XS", "L"];
    expect(sortSizes(sizes)).toEqual(["XS", "S", "M", "L", "XL"]);
  });

  it("trie les pointures de chaussures par ordre numérique croissant", () => {
    const shoeSizes = ["44", "41", "43", "40", "42"];
    expect(sortSizes(shoeSizes)).toEqual(["40", "41", "42", "43", "44"]);
  });
});
