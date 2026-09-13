import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import analyzeRouter from "./routes/analyze.js";

const app = express();

// Images sent as base64 can be a few MB; give body-parser headroom.
app.use(express.json({ limit: "20mb" }));

const origins = (process.env.CORS_ORIGINS || "*").split(",").map((o) => o.trim());
app.use(cors({ origin: origins.includes("*") ? true : origins }));

// Coarse network-level guard in front of the per-device daily cap in
// freeScanLimit — stops a single client from hammering the endpoint.
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
app.use("/api", analyzeRouter);

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`PlantApp server listening on http://localhost:${port}`);
});
