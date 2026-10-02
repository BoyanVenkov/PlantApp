/** Same limit as the native version. */
const MAX_EDGE = 1024;

export interface PreparedImage {
  /** A JPEG data URL, so it survives page reloads when kept in history. */
  uri: string;
  base64: string;
}

function loadImage(uri: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read the photo."));
    img.src = uri;
  });
}

/** Web preview: resizes with a canvas instead of expo-image-manipulator. */
export async function prepareImage(uri: string): Promise<PreparedImage> {
  const img = await loadImage(uri);
  const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
  return { uri: dataUrl, base64: dataUrl.split(",")[1] };
}

/** Prepared images are already self-contained data URLs. */
export function persistImages(uris: string[], _prefix: string): string[] {
  return uris;
}
