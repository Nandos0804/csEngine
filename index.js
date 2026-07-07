import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");

const PORT = process.env.PORT || 3000;

const app = express();
// Only the Csound WASM package needs to be reachable by the browser; the
// rest of node_modules (and every other installed package's source) has no
// reason to be publicly servable.
app.use(
  "/node_modules/@csound/browser",
  express.static(path.join(__dirname, "node_modules", "@csound", "browser")),
);
app.use(express.static(PUBLIC_DIR));

app.listen(PORT, () => {
  console.log(`csound-audio-app listening on http://localhost:${PORT}`);
});
