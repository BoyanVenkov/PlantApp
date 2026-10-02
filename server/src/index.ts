import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import analyzeRouter from "./routes/analyze.js";

const app = express();

// Hosts like Railway/Render/Fly sit behind one proxy hop. Without this every
// request looks like it comes from the proxy's IP, so the rate limit below
// would be shared by all users at once.
app.set("trust proxy", 1);

// Images sent as base64 can be a few MB; give body-parser headroom.
app.use(express.json({ limit: "20mb" }));

const origins = (process.env.CORS_ORIGINS || "*").split(",").map((o) => o.trim());
app.use(cors({ origin: origins.includes("*") ? true : origins }));

// Coarse network-level guard in front of the per-device daily cap in
// dailyScanCap — stops a single client from hammering the endpoint.
app.use(
  "/api/",
  rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.get("/health", (_req, res) => res.json({ ok: true }));
// The policy lives on GitHub Pages (docs/privacy.html); this just forwards old links.
app.get("/privacy", (_req, res) => res.redirect(301, "https://boyanvenkov.github.io/PlantApp/privacy.html"));
app.use("/api", analyzeRouter);

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`PlantApp server listening on http://localhost:${port}`);
});
