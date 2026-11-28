import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import fs from "fs";
import path from "path";
import JavaScriptObfuscator from "javascript-obfuscator";
import { getAssetVaultMap, VAULT_KEY_HEX } from "./scripts/asset-vault-config.mjs";

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

function stripPendingFaqPlugin() {
  return {
    name: "strip-pending-faq",
    transform(code, id) {
      if (id.replace(/\\/g, '/').endsWith('src/seo/faq.js')) {
        return code.replace(/\{[^{}]*status:\s*['"]pending['"][^{}]*\},?/g, '');
      }
    },
  };
}

function minifyGlslString(src) {
  // Preserve ${...} template expressions safely
  const exprs = [];
  const placeholderText = src.replace(/\$\{[^}]*\}/g, (match) => {
    const idx = exprs.length;
    exprs.push(match);
    return `__CGEM_EXPR_${idx}__`;
  });

  // Strip /* ... */ block comments and // ... line comments (not URLs)
  const noComments = placeholderText
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1");

  const lines = noComments
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let out = "";
  let prevWasDirective = false;

  for (const line of lines) {
    const isDirective = line.startsWith("#");
    const compact = isDirective
      ? line.replace(/[ \t]+/g, " ")
      : line
          .replace(/[ \t]+/g, " ")
          .replace(/\s*([;{}(),=])\s*/g, "$1");

    if (isDirective) {
      if (out.length > 0 && !out.endsWith("\n")) out += "\n";
      out += compact + "\n";
      prevWasDirective = true;
    } else {
      if (out.length > 0 && !prevWasDirective && !out.endsWith("\n")) {
        out += " ";
      }
      out += compact;
      prevWasDirective = false;
    }
  }

  return out.replace(/__CGEM_EXPR_(\d+)__/g, (_, idx) => exprs[Number(idx)]);
}

function glslMinifyPlugin() {
  return {
    name: "glsl-minify-plugin",
    apply: "build",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith(".js") && !id.endsWith(".jsx")) return null;
      if (id.includes("node_modules")) return null;
      if (
        !code.includes("ShaderMaterial") &&
        !code.includes("onBeforeCompile") &&
        !code.includes("vertexShader") &&
        !code.includes("fragmentShader") &&
        !code.includes("/* glsl */")
      ) {
        return null;
      }

      const glslMarker =
        /\b(gl_Position|gl_FragColor|gl_FragCoord|void\s+main\s*\(|precision\s+highp|#include\s*<|uniform\s+\w+|varying\s+\w+)\b/;

      const transformed = code.replace(/`([\s\S]*?)`/g, (full, inner) => {
        if (!glslMarker.test(inner)) return full;
        return "`" + minifyGlslString(inner) + "`";
      });

      return transformed !== code ? { code: transformed, map: null } : null;
    },
  };
}

function appObfuscatorPlugin() {
  return {
    name: "app-obfuscator-plugin",
    apply: "build",
    enforce: "post",
    renderChunk(code, chunk) {
      // Only obfuscate application chunks, keep vendor/three/react fast and untouched
      if (!chunk.fileName.endsWith(".js")) return null;
      if (
        chunk.fileName.includes("vendor") ||
        chunk.fileName.includes("draco")
      ) {
        return null;
      }

      const result = JavaScriptObfuscator.obfuscate(code, {
        compact: true,
        controlFlowFlattening: false,
        deadCodeInjection: false,
        debugProtection: false,
        disableConsoleOutput: true,
        identifierNamesGenerator: "hexadecimal",
        log: false,
        numbersToExpressions: false,
        renameGlobals: false,
        selfDefending: false,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 10,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ["rc4"],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 1,
        stringArrayThreshold: 0.75,
        transformObjectKeys: false,
        unicodeEscapeSequence: false,
      });

      return { code: result.getObfuscatedCode(), map: null };
    },
  };
}

export default defineConfig(({ command }) => {
  const isBuild = command === "build";
  const publicDir = path.resolve(__dirname, "public");
  const vaultMap = isBuild ? getAssetVaultMap(publicDir) : {};

  return {
    plugins: [
      glslMinifyPlugin(),
      react(),
      saveTimelinePlugin(),
      stripPendingFaqPlugin(),
      appObfuscatorPlugin(),
    ],

    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },

    build: {
      target: ["es2020", "edge88", "firefox78", "chrome87", "safari14"],
      cssTarget: "chrome87",
      sourcemap: false,
      rolldownOptions: {
        output: {
          manualChunks(id) {
            if (id.includes("node_modules")) {
              return "vendor";
            }
          },
        },
      },
    },

    define: {
      "import.meta.env.VITE_MEDIA_BASE_URL": JSON.stringify(
        process.env.VITE_MEDIA_BASE_URL || "https://media.cinegemstudio.com"
      ),
      __ASSET_VAULT_MAP__: JSON.stringify(vaultMap),
      __ASSET_VAULT_KEY__: JSON.stringify(isBuild ? VAULT_KEY_HEX : ""),
    },

    server: {
      host: true, // listen on all interfaces
      port: 5173,

      // allow Cloudflare Tunnel hostname
      allowedHosts: true,

      historyApiFallback: true,

      watch: {
        ignored: ["**/*.zip", "**/*.tar.gz", "**/dist/**", "**/responsive-report/**"],
      },
    },
  };
});
