import type { NextFunction, Request, Response } from "express";

/**
 * Hard per-device daily cap on scans — the one thing standing between a single
 * heavy user (or a script) and an unbounded Gemini bill. It applies to
 * everyone, including "Remove ads" buyers: a one-time purchase can't fund
 * unlimited AI calls forever.
 *
 * How many of those scans are free vs. unlocked by a rewarded video is a
 * client-side UX policy (mobile/src/services/usageLimiter.ts); the server only
 * guarantees the ceiling. Before relying on rewarded ads for revenue at scale,
 * add AdMob server-side verification (SSV) so unlocks can be checked here too.
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

const DAILY_SCAN_CAP = Number(process.env.DAILY_SCAN_CAP || 15);

interface Bucket {
  date: string; // yyyy-mm-dd, UTC
  count: number;
}

const usage = new Map<string, Bucket>();

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dailyScanCap(req: Request, res: Response, next: NextFunction) {
  const deviceId = req.header("x-device-id");
  if (!deviceId) {
    return res.status(400).json({ error: "Missing X-Device-Id header." });
  }

  const date = today();
  const bucket = usage.get(deviceId);

  if (!bucket || bucket.date !== date) {
    usage.set(deviceId, { date, count: 1 });
    return next();
  }

  if (bucket.count >= DAILY_SCAN_CAP) {
    return res.status(429).json({
      error: "Daily scan limit reached.",
      limit: DAILY_SCAN_CAP,
    });
  }

  bucket.count += 1;
  next();
}
