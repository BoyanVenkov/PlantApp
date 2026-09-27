import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Directory, File, Paths } from "expo-file-system";

/**
 * Longest edge sent to Gemini. Phone cameras shoot ~4000px; past ~1024px the
 * model sees no extra useful detail, but uploads get slower and cost more.
 */
const MAX_EDGE = 1024;

export interface PreparedImage {
  /** Resized JPEG in the cache dir — also what gets kept for history. */
  uri: string;
  base64: string;
}

export async function prepareImage(uri: string): Promise<PreparedImage> {
  const context = ImageManipulator.manipulate(uri);
  const original = await context.renderAsync();
  const { width, height } = original;

  let image = original;
  if (Math.max(width, height) > MAX_EDGE) {
    context.resize(width >= height ? { width: MAX_EDGE } : { height: MAX_EDGE });
    image = await context.renderAsync();
  }

  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!saved.base64) throw new Error("Couldn't read the photo.");
  return { uri: saved.uri, base64: saved.base64 };
}

/**
 * The picker and manipulator both write to the cache dir, which the OS may
 * purge. Anything shown in History or My Plants must live in documents.
 */
export function persistImages(uris: string[], prefix: string): string[] {
  const dir = new Directory(Paths.document, "scans");
  if (!dir.exists) dir.create({ intermediates: true });

  return uris.map((uri, i) => {
    const dest = new File(dir, `${prefix}-${i}.jpg`);
    new File(uri).copy(dest);
    return dest.uri;
  });
}
