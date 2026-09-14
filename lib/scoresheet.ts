const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

const MAX_BYTES = 8 * 1024 * 1024;

export async function readScoresheetFile(file: File | null | undefined) {
  if (!file || file.size === 0) return null;
  if (file.type && !ALLOWED_TYPES.has(file.type) && !file.type.startsWith("image/")) {
    return { error: "La planilla debe ser una foto (JPG, PNG o WEBP)." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "La foto de la planilla no puede pesar más de 8 MB." };
  }
  const data = Buffer.from(await file.arrayBuffer());
  return {
    data,
    mimeType: file.type || "image/jpeg",
    fileName: file.name || "planilla.jpg",
  };
}
