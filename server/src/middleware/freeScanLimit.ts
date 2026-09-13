import type { NextFunction, Request, Response } from "express";

/**
 * In-memory per-device daily cap on free scans. This exists because every scan
 * costs real money (Gemini call) while the app itself is ad-supported/free —
 * without a cap, a handful of heavy free users can blow past ad revenue.
 *
 * This is intentionally simple (good for a single-instance deploy / MVP).
 * Before scaling to multiple server instances, swap the Map for Redis
 * (or similar shared store) so the cap is enforced across instances.
 *
 * Device identity here is a client-supplied header, which a motivated user
 * could spoof or clear. That's an acceptable MVP tradeoff (it stops casual
 * overuse, not determined abuse). Before real launch, tie this to an
 * anonymous auth id (e.g. Firebase Anonymous Auth) issued and verified
 * server-side instead of trusting a client header.
 */

const FREE_SCANS_PER_DAY = Number(process.env.FREE_SCANS_PER_DAY || 5);

interface Bucket {
  date: string; // yyyy-mm-dd, server-local
  count: number;
}

const usage = new Map<string, Bucket>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function freeScanLimit(req: Request, res: Response, next: NextFunction) {
  const isPro = req.header("x-pro-entitlement") === "true";
  if (isPro) {
    // NOTE: this header is client-asserted, i.e. trivially fakeable. It's fine
    // as a soft gate for now (worst case a free user skips the cap), but
    // before launch verify entitlement server-side via a RevenueCat webhook
    // or their REST API instead of trusting the client.
    return next();
  }

  const deviceId = req.header("x-device-id");
  if (!deviceId) {
    return res.status(400).json({ error: "Missing X-Device-Id header." });
  }

  const bucket = usage.get(deviceId);
  const date = today();

  if (!bucket || bucket.date !== date) {
    usage.set(deviceId, { date, count: 1 });
    return next();
  }

  if (bucket.count >= FREE_SCANS_PER_DAY) {
    return res.status(429).json({
      error: "Daily free scan limit reached.",
      limit: FREE_SCANS_PER_DAY,
    });
  }

  bucket.count += 1;
  next();
}
