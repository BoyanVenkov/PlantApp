import { GoogleGenAI, MediaResolution, ThinkingLevel, Type } from "@google/genai";
import type { PlantAnalysis } from "../types.js";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set. Copy server/.env.example to server/.env and fill it in.");
}

const genAI = new GoogleGenAI({ apiKey });
const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

// USD per 1M tokens, used only for the per-scan cost log line. Defaults match
// gemini-3.5-flash-lite; update them if you switch GEMINI_MODEL.
const PRICE_INPUT_PER_M = Number(process.env.GEMINI_PRICE_INPUT_PER_M || 0.3);
const PRICE_OUTPUT_PER_M = Number(process.env.GEMINI_PRICE_OUTPUT_PER_M || 2.5);

// Mirrors PlantAnalysis in ../types.ts. Gemini enforces this shape server-side
// so the mobile app never has to defensively parse free-form text.
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    isPlant: { type: Type.BOOLEAN },
    rejectionReason: { type: Type.STRING, nullable: true },
    identification: {
      type: Type.OBJECT,
      properties: {
        commonName: { type: Type.STRING },
        scientificName: { type: Type.STRING },
        family: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
        alternativeMatches: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              commonName: { type: Type.STRING },
              scientificName: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
            },
            required: ["commonName", "scientificName", "confidence"],
          },
        },
      },
      required: ["commonName", "scientificName", "family", "confidence", "alternativeMatches"],
    },
    care: {
      type: Type.OBJECT,
      properties: {
        light: {
          type: Type.OBJECT,
          properties: {
            level: { type: Type.STRING, enum: ["low", "medium", "bright_indirect", "full_sun"] },
            description: { type: Type.STRING },
          },
          required: ["level", "description"],
        },
        water: {
          type: Type.OBJECT,
          properties: {
            frequencyDescription: { type: Type.STRING },
            intervalDays: { type: Type.INTEGER },
            description: { type: Type.STRING },
          },
          required: ["frequencyDescription", "intervalDays", "description"],
        },
        temperature: {
          type: Type.OBJECT,
          properties: {
            minCelsius: { type: Type.NUMBER },
            maxCelsius: { type: Type.NUMBER },
            description: { type: Type.STRING },
          },
          required: ["minCelsius", "maxCelsius", "description"],
        },
        humidity: {
          type: Type.OBJECT,
          properties: {
            level: { type: Type.STRING, enum: ["low", "medium", "high"] },
            description: { type: Type.STRING },
          },
          required: ["level", "description"],
        },
        soil: { type: Type.STRING },
        fertilizing: { type: Type.STRING },
        pruning: { type: Type.STRING },
        propagation: { type: Type.STRING },
        petToxicity: { type: Type.STRING },
      },
      required: [
        "light",
        "water",
        "temperature",
        "humidity",
        "soil",
        "fertilizing",
        "pruning",
        "propagation",
        "petToxicity",
      ],
    },
    health: {
      type: Type.OBJECT,
      properties: {
        status: { type: Type.STRING, enum: ["healthy", "mild_stress", "sick", "critical", "unknown"] },
        summary: { type: Type.STRING },
        issuesDetected: { type: Type.ARRAY, items: { type: Type.STRING } },
        recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ["status", "summary", "issuesDetected", "recommendations"],
    },
    edibility: {
      type: Type.OBJECT,
      properties: {
        isEdible: { type: Type.BOOLEAN },
        edibleParts: { type: Type.ARRAY, items: { type: Type.STRING } },
        benefits: { type: Type.ARRAY, items: { type: Type.STRING } },
        risksAndWarnings: { type: Type.ARRAY, items: { type: Type.STRING } },
        preparationNotes: { type: Type.STRING },
        safetyDisclaimer: { type: Type.STRING },
      },
      required: ["isEdible", "edibleParts", "benefits", "risksAndWarnings", "preparationNotes", "safetyDisclaimer"],
    },
  },
  required: ["isPlant", "rejectionReason", "identification", "care", "health", "edibility"],
};

const SYSTEM_INSTRUCTION = `You are a professional botanist and horticulturist with decades of field
and clinical-plant-pathology experience, acting as the analysis engine behind a plant ID app.

You will receive 1-3 photos of the same plant. Respond ONLY with JSON matching the given schema.

Rules:
1. If the photo(s) do not clearly show a plant (or are too blurry/dark to assess), set isPlant to
   false, fill rejectionReason with a short plain-language reason, and still return the full JSON
   shape with reasonable empty/neutral placeholder values in the other fields.
2. Identify the single most likely species. If you are not confident, say so honestly via a lower
   confidence score rather than guessing with false certainty, and list real alternative candidates
   in alternativeMatches.
3. Care guidance should be specific and actionable (e.g. "water when the top 3cm of soil is dry",
   not just "water regularly"). Assume an average home/garden setting unless the photo suggests
   otherwise (e.g. clearly outdoor landscaping vs. a windowsill pot).
4. For health: look for visible signs in the photo — leaf discoloration/spotting, wilting, pest
   damage, mold, edema, etiolation, etc. If the plant looks healthy, say so plainly. Keep
   recommendations concrete and prioritized (most urgent first).
5. Edibility is a safety-critical judgment. Many toxic plants closely resemble edible ones
   (e.g. poison hemlock vs. wild carrot/parsley; death camas vs. wild onion; toxic vs. edible
   berries). Therefore:
   - Only set isEdible to true when the species identification confidence is reasonably high AND
     the species is unambiguously known as edible.
   - If confidence is low, or the plant has any commonly-confused toxic lookalike, set isEdible to
     false or clearly hedge in risksAndWarnings even if the top guess is typically edible.
   - ALWAYS populate safetyDisclaimer with a caution to have a positive ID confirmed by a local
     expert, extension office, or field guide cross-reference before ever consuming a wild or
     unfamiliar plant, and to never eat anything based on a single photo-based app identification.
   - benefits should describe genuine nutritional/traditional/medicinal uses when isEdible is true,
     but must not overstate medical claims.
6. Keep it short: every description/text field is 1-2 plain sentences, every list has at most 4
   items, and alternativeMatches has at most 3 entries. Users read this on a phone.
7. care.water.intervalDays is the typical number of days between waterings for this plant in an
   average home (or garden, if clearly outdoors) during the growing season. It drives watering
   reminders, so give a single realistic integer (e.g. 7), never 0.
8. Never break character, never mention that you are an AI model, and never include markdown or
   commentary outside the JSON.
9. Write every human-readable text field (names, descriptions, lists, rejectionReason, disclaimer)
   in the language the user message asks for. commonName is the name people use for this plant in
   that language. scientificName stays in Latin, and enum fields keep their exact English values.`;

const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

/** "pt-BR" -> "Brazilian Portuguese"; anything unknown falls back to English. */
function languageName(tag: string | undefined): string {
  if (!tag) return "English";
  try {
    return languageNames.of(tag) ?? "English";
  } catch {
    return "English";
  }
}

function toInlineImage(base64: string) {
  // Client sends raw base64 without a data: prefix; assume JPEG (camera/gallery default).
  return { inlineData: { mimeType: "image/jpeg", data: base64 } };
}

export async function analyzePlantImages(images: string[], language?: string): Promise<PlantAnalysis> {
  if (images.length === 0) {
    throw new Error("At least one image is required.");
  }

  const response = await genAI.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            // Kept out of the system instruction so that stays identical across
            // languages (and cacheable).
            text:
              "Analyze the plant in these photo(s) and return the JSON described in your instructions. " +
              `Write all text fields in ${languageName(language)}.`,
          },
          ...images.map(toInlineImage),
        ],
      },
    ],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.3,
      // The biggest cost lever: thinking tokens are billed as output. Structured
      // extraction like this doesn't benefit much from long reasoning.
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
      // Photos are already resized to ~1024px on the phone; medium resolution
      // keeps leaf detail while capping each image at a few hundred tokens.
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
    },
  });

  logUsage(response.usageMetadata, images.length);

  const text = response.text;
  if (!text) {
    throw new Error("Empty response from Gemini.");
  }

  return JSON.parse(text) as PlantAnalysis;
}

function logUsage(
  usage: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } | undefined,
  imageCount: number
) {
  if (!usage) return;
  const input = usage.promptTokenCount ?? 0;
  const output = (usage.candidatesTokenCount ?? 0) + (usage.thoughtsTokenCount ?? 0);
  const costUsd = (input * PRICE_INPUT_PER_M + output * PRICE_OUTPUT_PER_M) / 1_000_000;
  console.log(
    `[gemini] ${MODEL} | ${imageCount} img | in ${input} tok | out ${usage.candidatesTokenCount ?? 0} tok` +
      ` + thinking ${usage.thoughtsTokenCount ?? 0} tok | ~$${costUsd.toFixed(5)} (${(costUsd * 100).toFixed(2)}¢)`
  );
}
