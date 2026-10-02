const KEY = "plantapp.device_id";
let cached: string | null = null;

/** Web preview: SecureStore is mobile-only, so the id lives in localStorage. */
export async function getDeviceId(): Promise<string> {
  if (cached) return cached;

  const existing = localStorage.getItem(KEY);
  if (existing) {
    cached = existing;
    return existing;
  }

  const id = crypto.randomUUID();
  localStorage.setItem(KEY, id);
  cached = id;
  return id;
}
