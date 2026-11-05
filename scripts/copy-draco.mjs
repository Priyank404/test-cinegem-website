import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "node_modules/three/examples/jsm/libs/draco");
const destination = path.join(root, "public/draco");

await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true, force: true });
console.log(`[build] Copied pinned Draco decoder assets to ${destination}`);

