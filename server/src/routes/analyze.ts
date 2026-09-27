import { Router } from "express";
import { z } from "zod";
import { analyzePlantImages } from "../services/gemini.js";
import { dailyScanCap } from "../middleware/dailyScanCap.js";

const router = Router();

const bodySchema = z.object({
  images: z.array(z.string().min(100)).min(1).max(3),
});

router.post("/analyze", dailyScanCap, async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid request.", details: parsed.error.flatten() });
  }

  try {
    const result = await analyzePlantImages(parsed.data.images);
    res.json(result);
  } catch (err) {
    console.error("[analyze] Gemini call failed:", err);
    res.status(502).json({ error: "Plant analysis failed. Please try again." });
  }
});

export default router;
