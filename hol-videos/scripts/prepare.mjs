import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const from = join(here, "..", "..", "lab2", "shots");
const to = join(here, "..", "public", "shots");
mkdirSync(to, { recursive: true });
cpSync(from, to, { recursive: true });
console.log("copied", from, "->", to);
