export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatXOF(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 0,
  }).format(amount) + " FCFA";
}

export async function resizeImage(
  file: File,
  { maxDimension, quality }: { maxDimension: number; quality: number }
): Promise<File | Blob> {
  const validTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!validTypes.includes(file.type)) {
    throw new Error("Format non supporté. Formats acceptés : JPEG, PNG, WEBP.");
  }

  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error("L'image dépasse la taille maximale autorisée de 5 Mo.");
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: width, naturalHeight: height } = img;

      // Ne jamais agrandir : si déjà dans les limites, retourner le fichier d'origine
      if (width <= maxDimension && height <= maxDimension) {
        resolve(file);
        return;
      }

      const ratio = Math.min(maxDimension / width, maxDimension / height);
      const targetWidth = Math.round(width * ratio);
      const targetHeight = Math.round(height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            resolve(file);
          }
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Impossible de lire l'image sélectionnée."));
    };

    img.src = url;
  });
}

export async function resizeImageToMax1600(file: File): Promise<File | Blob> {
  return resizeImage(file, { maxDimension: 1600, quality: 0.85 });
}
