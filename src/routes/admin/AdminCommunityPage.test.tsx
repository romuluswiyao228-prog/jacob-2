import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import AdminCommunityPage from "./AdminCommunityPage";
import type { CommunityPhoto } from "@/lib/db-types";

const mocks = vi.hoisted(() => ({
  showToast: vi.fn(),
  storageRemove: vi.fn(),
}));
const { showToast, storageRemove } = mocks;

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ showToast: mocks.showToast }),
}));

// ── Données simulées ─────────────────────────────────────────────────────────

let photoRows: CommunityPhoto[] = [];
const writeCalls: Array<{ table: string; op: string; payload: unknown }> = [];

const basePhoto: CommunityPhoto = {
  id: "photo-1",
  image_url: "https://example.com/community/1.webp",
  alt_text: "Client en tenue Jacob",
  caption: "Légende de test",
  link_path: null,
  sort_order: 0,
  is_active: false,
  consent_confirmed: false,
  created_at: "2026-11-10T00:00:00Z",
};

function tableData(table: string): unknown[] {
  switch (table) {
    case "community_photos":
      return photoRows;
    case "products":
      return [{ id: "prod-1", slug: "tshirt-oversize", name: "T-Shirt Oversize" }];
    case "collections":
      return [{ id: "col-1", slug: "ete-2026", name: "Été 2026" }];
    default:
      return [];
  }
}

// ── Mock Supabase : constructeur « thenable » comme supabase-js ─────────────

vi.mock("@/lib/supabase", () => {
  const makeBuilder = (table: string) => {
    let op = "select";
    let payload: unknown = null;
    const builder: Record<string, unknown> = {};
    const chain = () => builder;
    builder.select = chain;
    builder.eq = chain;
    builder.in = chain;
    builder.order = chain;
    builder.limit = chain;
    builder.maybeSingle = () => Promise.resolve({ data: null, error: null });
    builder.single = () => Promise.resolve({ data: null, error: null });
    builder.insert = (value: unknown) => {
      op = "insert";
      payload = value;
      return builder;
    };
    builder.update = (value: unknown) => {
      op = "update";
      payload = value;
      return builder;
    };
    builder.delete = () => {
      op = "delete";
      return builder;
    };
    builder.then = (resolve: (value: unknown) => void) => {
      if (op === "select") {
        resolve({ data: tableData(table), error: null });
      } else {
        writeCalls.push({ table, op, payload });
        resolve({ data: null, error: null });
      }
    };
    return builder;
  };

  return {
    supabase: {
      from: (table: string) => makeBuilder(table),
      storage: {
        from: () => ({
          upload: vi.fn(),
          getPublicUrl: vi.fn(() => ({ data: { publicUrl: "" } })),
          remove: mocks.storageRemove,
        }),
      },
    },
  };
});

// ── Rendu ────────────────────────────────────────────────────────────────────

let roots: Root[] = [];

async function renderPage(): Promise<HTMLDivElement> {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  await act(async () => {
    root.render(<AdminCommunityPage />);
  });
  // Laisse le temps à loadData() (Promise.all) de résoudre
  await act(async () => {});

  return container;
}

function findButton(container: HTMLElement, text: string): HTMLButtonElement | null {
  return (
    Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes(text)
    ) ?? null
  );
}

describe("AdminCommunityPage - consentement", () => {
  beforeEach(() => {
    photoRows = [{ ...basePhoto }];
    writeCalls.length = 0;
    showToast.mockClear();
    storageRemove.mockReset();
    storageRemove.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    roots.forEach((root) => root.unmount());
    roots = [];
    document.body.innerHTML = "";
  });

  it("bloque l'activation d'une photo sans accord de la personne", async () => {
    const container = await renderPage();

    // La case « Activer la photo » est désactivée sans consentement
    const checkboxes = Array.from(
      container.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    );
    const consentBox = checkboxes.find((box) =>
      box.closest("label")?.textContent?.includes("accord de la personne")
    );
    const activationBox = checkboxes.find((box) =>
      box.closest("label")?.textContent?.includes("Activer la photo")
    );
    expect(consentBox).toBeDefined();
    expect(activationBox?.disabled).toBe(true);

    // Le bouton « Afficher » ne doit rien enregistrer et avertir l'admin
    const showButton = findButton(container, "Afficher");
    expect(showButton).not.toBeNull();
    await act(async () => {
      showButton?.click();
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining("accord"),
      "error"
    );
    expect(writeCalls.filter((call) => call.op === "update")).toHaveLength(0);
    expect(photoRows[0].is_active).toBe(false);
  });

  it("active la photo quand le consentement est confirmé", async () => {
    photoRows = [{ ...basePhoto, consent_confirmed: true }];

    const container = await renderPage();

    const showButton = findButton(container, "Afficher");
    expect(showButton).not.toBeNull();
    await act(async () => {
      showButton?.click();
    });

    const updates = writeCalls.filter(
      (call) => call.table === "community_photos" && call.op === "update"
    );
    expect(updates).toHaveLength(1);
    expect((updates[0].payload as { is_active: boolean }).is_active).toBe(true);
  });

  it("supprime la ligne ET le fichier du bucket store-assets", async () => {
    photoRows = [
      {
        ...basePhoto,
        image_url:
          "https://proj.supabase.co/storage/v1/object/public/store-assets/community/abc-1.webp",
      },
    ];

    const container = await renderPage();

    const deleteButton = findButton(container, "Supprimer");
    expect(deleteButton).not.toBeNull();
    await act(async () => {
      deleteButton?.click();
    });

    // La ligne est supprimée en base…
    expect(
      writeCalls.filter(
        (call) => call.table === "community_photos" && call.op === "delete"
      )
    ).toHaveLength(1);

    // …et le fichier correspondant est retiré du bucket
    expect(storageRemove).toHaveBeenCalledTimes(1);
    expect(storageRemove).toHaveBeenCalledWith(["community/abc-1.webp"]);
    expect(showToast).toHaveBeenCalledWith("Photo supprimée.", "success");
  });

  it("affiche une erreur claire si la suppression du fichier échoue", async () => {
    photoRows = [
      {
        ...basePhoto,
        image_url:
          "https://proj.supabase.co/storage/v1/object/public/store-assets/community/abc-1.webp",
      },
    ];
    storageRemove.mockResolvedValue({
      data: null,
      error: { message: "permission denied" },
    });

    const container = await renderPage();

    const deleteButton = findButton(container, "Supprimer");
    await act(async () => {
      deleteButton?.click();
    });

    expect(showToast).toHaveBeenCalledWith(
      expect.stringContaining("n'a pas pu être effacé du stockage"),
      "error"
    );
  });
});
