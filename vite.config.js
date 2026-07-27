import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import fs from "fs";
import path from "path";

function saveTimelinePlugin() {
  return {
    name: "save-timeline-plugin",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.method === "POST" && req.url === "/api/save-timeline") {
          let body = "";
          req.on("data", (chunk) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              const { beats, target = "desktop" } = JSON.parse(body);
              const ringHeroPath = path.resolve(__dirname, "src/components/three/RingHero.jsx");
              let fileContent = fs.readFileSync(ringHeroPath, "utf8");

              const varName = target === "mobile" ? "MOBILE_BEATS" : "BEATS";

              // Serialize beats beautifully
              const serializedBeats = `export const ${varName} = [\n` + beats.map((beat, i) => {
                const parts = [
                  `    frame: ${beat.frame !== undefined ? beat.frame : (i * 20)}`,
                  `    bgTop: ${JSON.stringify(beat.bgTop)}`,
                  `    bgBottom: ${JSON.stringify(beat.bgBottom)}`,
                  `    camPos: { x: ${Number(beat.camPos.x).toFixed(2)}, y: ${Number(beat.camPos.y).toFixed(2)}, z: ${Number(beat.camPos.z).toFixed(2)}, lookAtY: ${Number(beat.camPos.lookAtY ?? 0).toFixed(2)} }`,
                  `    ringRot: { x: ${Number(beat.ringRot.x).toFixed(2)}, y: ${Number(beat.ringRot.y).toFixed(2)}, z: ${Number(beat.ringRot.z).toFixed(2)} }`,
                  `    metalEnvIntensity: ${Number(beat.metalEnvIntensity).toFixed(2)}`,
                  `    gemEnvIntensity: ${Number(beat.gemEnvIntensity).toFixed(2)}`,
                  `    cornerPark: ${Number(beat.cornerPark ?? 0).toFixed(2)}`
                ];
                if (beat.ringPosOffset) {
                  parts.push(`    ringPosOffset: { x: ${Number(beat.ringPosOffset.x).toFixed(2)}, y: ${Number(beat.ringPosOffset.y).toFixed(2)}, z: ${Number(beat.ringPosOffset.z).toFixed(2)} }`);
                }
                if (beat.ringScale !== undefined) {
                  parts.push(`    ringScale: ${Number(beat.ringScale).toFixed(2)}`);
                }
                return "  {\n    // Keyframe at frame " + (beat.frame !== undefined ? beat.frame : (i * 20)) + "\n" + parts.join(",\n") + "\n  }";
              }).join(",\n") + "\n];";

              // Replace the targeted timeline array in the fileContent
              const regex = new RegExp(`export const ${varName} = \\[\\s*[\\s\\S]*?\\n\\];`, "g");
              const newContent = fileContent.replace(regex, serializedBeats);

              fs.writeFileSync(ringHeroPath, newContent, "utf8");

              res.statusCode = 200;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: true }));
            } catch (err) {
              console.error(err);
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: err.message }));
            }
          });
        } else {
          next();
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), saveTimelinePlugin()],

  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },

  server: {
    host: true, // listen on all interfaces
    port: 5173,

    // allow Cloudflare Tunnel hostname
    allowedHosts: true,

    historyApiFallback: true,
  },
});