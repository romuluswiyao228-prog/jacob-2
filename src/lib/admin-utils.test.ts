import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resizeImage, resizeImageToMax1600, canActivateHomeSlide, isSlideImageRecommended } from "./admin-utils";

describe("resizeImage", () => {
  let originalImage: typeof Image;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    originalImage = globalThis.Image;
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = vi.fn(() => "blob:mock-url");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    globalThis.Image = originalImage;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it("garde le fichier d'origine s'il est plus petit que maxDimension (pas d'agrandissement)", async () => {
    class MockImage {
      naturalWidth = 800;
      naturalHeight = 600;
      width = 800;
      height = 600;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    // @ts-expect-error Mocking Image
    globalThis.Image = MockImage;

    const file = new File(["dummy content"], "photo.jpg", { type: "image/jpeg" });
    const result = await resizeImage(file, { maxDimension: 1600, quality: 0.85 });

    // Doit retourner exactement le même fichier d'origine sans l'agrandir
    expect(result).toBe(file);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
  });

  it("ne redimensionne pas et ne fait pas d'agrandissement si déjà dans les limites exactes", async () => {
    class MockImage {
      naturalWidth = 1600;
      naturalHeight = 1200;
      width = 1600;
      height = 1200;
      onload: (() => void) | null = null;
      set src(_value: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    // @ts-expect-error Mocking Image
    globalThis.Image = MockImage;

    const file = new File(["dummy content"], "photo.png", { type: "image/png" });
    const result = await resizeImage(file, { maxDimension: 1600, quality: 0.9 });

    expect(result).toBe(file);
  });

  it("redimensionne avec imageSmoothingQuality = 'high' et transmet le paramètre de qualité", async () => {
    class MockImage {
      naturalWidth = 3000;
      naturalHeight = 2000;
      width = 3000;
      height = 2000;
      onload: (() => void) | null = null;
      set src(_value: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    // @ts-expect-error Mocking Image
    globalThis.Image = MockImage;

    const drawImageSpy = vi.fn();
    let smoothingQualitySet = "";
    const mockCtx = {
      drawImage: drawImageSpy,
      imageSmoothingEnabled: false,
      set imageSmoothingQuality(val: string) {
        smoothingQualitySet = val;
      },
      get imageSmoothingQuality() {
        return smoothingQualitySet;
      },
    };

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      mockCtx as unknown as CanvasRenderingContext2D
    );

    const toBlobSpy = vi.fn((callback: (blob: Blob | null) => void, type?: string, _quality?: number) => {
      callback(new Blob(["mock webp data"], { type: type || "image/webp" }));
    });
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(toBlobSpy as unknown as typeof HTMLCanvasElement.prototype.toBlob);

    const file = new File(["dummy large content"], "banner.jpg", { type: "image/jpeg" });
    const result = await resizeImage(file, { maxDimension: 2400, quality: 0.9 });

    expect(result).toBeInstanceOf(Blob);
    expect(smoothingQualitySet).toBe("high");
    // Draw image avec dimensions proportionnelles : 3000x2000 réduit à max 2400 -> 2400x1600
    expect(drawImageSpy).toHaveBeenCalledWith(expect.anything(), 0, 0, 2400, 1600);
    // Vérifier que le format WebP et la qualité 0.9 sont passés à toBlob
    expect(toBlobSpy).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.9);
  });

  it("resizeImageToMax1600 appelle resizeImage avec maxDimension 1600 et quality 0.85", async () => {
    class MockImage {
      naturalWidth = 3200;
      naturalHeight = 2400;
      width = 3200;
      height = 2400;
      onload: (() => void) | null = null;
      set src(_value: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }
    // @ts-expect-error Mocking Image
    globalThis.Image = MockImage;

    const drawImageSpy = vi.fn();
    const mockCtx = {
      drawImage: drawImageSpy,
      imageSmoothingEnabled: false,
      imageSmoothingQuality: "",
    };

    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
      mockCtx as unknown as CanvasRenderingContext2D
    );

    const toBlobSpy = vi.fn((callback: (blob: Blob | null) => void, type?: string, _quality?: number) => {
      callback(new Blob(["mock webp data"], { type: type || "image/webp" }));
    });
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(toBlobSpy as unknown as typeof HTMLCanvasElement.prototype.toBlob);

    const file = new File(["dummy content"], "product.jpg", { type: "image/jpeg" });
    const result = await resizeImageToMax1600(file);

    expect(result).toBeInstanceOf(Blob);
    expect(drawImageSpy).toHaveBeenCalledWith(expect.anything(), 0, 0, 1600, 1200);
    expect(toBlobSpy).toHaveBeenCalledWith(expect.any(Function), "image/webp", 0.85);
  });

  it("rejette les types de fichiers non autorisés", async () => {
    const invalidFile = new File(["text"], "test.txt", { type: "text/plain" });
    await expect(
      resizeImage(invalidFile, { maxDimension: 1600, quality: 0.85 })
    ).rejects.toThrow("Format non supporté");
  });

  it("rejette les fichiers dépassant 5 Mo", async () => {
    const bigFile = new File([new Uint8Array(6 * 1024 * 1024)], "heavy.jpg", {
      type: "image/jpeg",
    });
    await expect(
      resizeImage(bigFile, { maxDimension: 1600, quality: 0.85 })
    ).rejects.toThrow("L'image dépasse la taille maximale");
  });
});

describe("canActivateHomeSlide - limite de 6 photos actives par côté", () => {
  it("autorise l'activation si moins de 6 photos sont actives", () => {
    expect(canActivateHomeSlide(0)).toBe(true);
    expect(canActivateHomeSlide(3)).toBe(true);
    expect(canActivateHomeSlide(5)).toBe(true);
  });

  it("refuse l'activation d'une 7e photo si 6 photos sont déjà actives", () => {
    expect(canActivateHomeSlide(6)).toBe(false);
    expect(canActivateHomeSlide(7)).toBe(false);
  });
});

describe("isSlideImageRecommended - recommandation photo verticale >= 1000px", () => {
  it("valide les photos verticales d'au moins 1000px de haut", () => {
    expect(isSlideImageRecommended(800, 1200)).toBe(true);
    expect(isSlideImageRecommended(1000, 1000)).toBe(true);
    expect(isSlideImageRecommended(1080, 1350)).toBe(true);
  });

  it("signale non recommandée une photo horizontale ou de moins de 1000px de haut", () => {
    expect(isSlideImageRecommended(1200, 800)).toBe(false); // horizontale
    expect(isSlideImageRecommended(600, 900)).toBe(false);  // verticale mais < 1000px
  });
});

