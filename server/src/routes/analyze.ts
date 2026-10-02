import { Router } from "express";
import { z } from "zod";
import { analyzePlantImages } from "../services/gemini.js";
import { dailyScanCap } from "../middleware/dailyScanCap.js";

const router = Router();

const bodySchema = z.object({
  images: z.array(z.string().min(100)).min(1).max(3),
  /** BCP 47 tag of the app's UI language, e.g. "de" or "pt-BR". Older app builds omit it. */
  language: z
    .string()
    .regex(/^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/)
    .optional(),
});

router.post("/analyze", dailyScanCap, async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request.", details: parsed.error.flatten() });
  }

  try {
    const result = await analyzePlantImages(parsed.data.images, parsed.data.language);
    res.json(result);
  } catch (err) {
    console.error("[analyze] Gemini call failed:", err);
    res.status(502).json({ error: "Plant analysis failed. Please try again." });
  }
});

export default router;
