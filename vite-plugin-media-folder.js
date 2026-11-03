// vite-plugin-media-folder.js
// Vite plugin to dynamically scan and serve media files (images & videos) from folders in /public
// and provide a high-speed proxy for Google Drive media (avoiding ORB / CORS blocks).
import fs from "fs";
import path from "path";

const IMAGE_EXTS = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif", ".gif", ".svg", ".bmp", ".tiff", ".tif", ".ico", ".heic", ".heif"]);
const VIDEO_EXTS = new Set([".mp4", ".webm", ".mov", ".m4v", ".avi", ".ogv", ".mkv", ".mpg", ".mpeg", ".3gp", ".flv", ".wmv", ".ts", ".m2ts"]);

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });

function getPublicDir(root) {
  return path.resolve(root || process.cwd(), "public");
}

function listAvailableMediaFolders(pubDir) {
  if (!fs.existsSync(pubDir)) return [];
  const entries = fs.readdirSync(pubDir, { withFileTypes: true });
  const folders = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(pubDir, entry.name);
    try {
      const files = fs.readdirSync(dir);
      const mediaFiles = files.filter((f) => {
        const ext = path.extname(f).toLowerCase();
        return IMAGE_EXTS.has(ext) || VIDEO_EXTS.has(ext);
      });
      if (mediaFiles.length > 0) {
        const images = mediaFiles.filter((f) => IMAGE_EXTS.has(path.extname(f).toLowerCase())).length;
        const videos = mediaFiles.filter((f) => VIDEO_EXTS.has(path.extname(f).toLowerCase())).length;
        folders.push({
          name: entry.name,
          count: mediaFiles.length,
          images,
          videos,
        });
      } else {
        folders.push({
          name: entry.name,
          count: 0,
          images: 0,
          videos: 0,
        });
      }
    } catch {
      // ignore
    }
  }
  return folders;
}

function scanMediaFolder(pubDir, requestedFolder) {
  if (!requestedFolder) return null;

  let targetPath = path.resolve(pubDir, requestedFolder);
  let resolvedFolder = requestedFolder;

  // Prevent path traversal
  if (!targetPath.startsWith(pubDir)) {
    return { error: "Access denied" };
  }

  // 1. Direct match
  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
    // 2. Case-insensitive / normalized match
    const entries = fs.readdirSync(pubDir, { withFileTypes: true }).filter((e) => e.isDirectory());
    const norm = requestedFolder.toLowerCase().replace(/[^a-z0-9]/g, "");
    const found = entries.find((e) => e.name.toLowerCase().replace(/[^a-z0-9]/g, "") === norm);
    if (found) {
      targetPath = path.resolve(pubDir, found.name);
      resolvedFolder = found.name;
    } else {
      if (norm.includes("creative")) {
        const creativeVisuals = entries.find((e) => e.name.toLowerCase().includes("creative"));
        if (creativeVisuals) {
          targetPath = path.resolve(pubDir, creativeVisuals.name);
          resolvedFolder = creativeVisuals.name;
        }
      }
    }
  }

  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isDirectory()) {
    return {
      success: false,
      notFound: true,
      folder: requestedFolder,
      availableFolders: listAvailableMediaFolders(pubDir),
    };
  }

  const rawFiles = fs.readdirSync(targetPath);
  rawFiles.sort(collator.compare);

  const items = [];
  for (const file of rawFiles) {
    const ext = path.extname(file).toLowerCase();
    const isImage = IMAGE_EXTS.has(ext);
    const isVideo = VIDEO_EXTS.has(ext);
    if (!isImage && !isVideo) continue;

    const base = path.basename(file, ext);
    const cleanAlt = base.replace(/[_-]+/g, " ").trim();

    // URL path relative to public/
    const src = `/${encodeURI(resolvedFolder)}/${encodeURI(file)}`;

    items.push({
      filename: file,
      src,
      type: isVideo ? "video" : "image",
      ext,
      alt: cleanAlt || file,
    });
  }

  const images = items.filter((i) => i.type === "image");
  const videos = items.filter((i) => i.type === "video");

  return {
    success: true,
    folder: resolvedFolder,
    requestedFolder,
    items,
    images,
    videos,
    total: items.length,
    availableFolders: listAvailableMediaFolders(pubDir),
  };
}

export function generateMediaManifest(root) {
  try {
    const pubDir = getPublicDir(root);
    const available = listAvailableMediaFolders(pubDir);
    const manifest = {
      generatedAt: new Date().toISOString(),
      folders: {},
      availableFolders: available.map((f) => f.name),
    };

    for (const folder of available) {
      const result = scanMediaFolder(pubDir, folder.name);
      if (result && result.success) {
        manifest.folders[folder.name] = {
          items: result.items,
          images: result.images,
          videos: result.videos,
          total: result.total,
        };
      }
    }

    const manifestPath = path.join(pubDir, "media-manifest.json");
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
    return manifest;
  } catch (err) {
    console.error("[media-folder-plugin] Error generating manifest:", err);
    return null;
  }
}

export default function mediaFolderPlugin() {
  let rootDir = process.cwd();

  return {
    name: "media-folder-plugin",

    configResolved(config) {
      rootDir = config.root;
      generateMediaManifest(rootDir);
    },

    buildStart() {
      generateMediaManifest(rootDir);
    },

    configureServer(server) {
      rootDir = server.config.root || process.cwd();
      const pubDir = getPublicDir(rootDir);

      // Generate initial manifest
      generateMediaManifest(rootDir);

      // Watch public directory for media file changes
      if (server.watcher) {
        const watchHandler = (filePath) => {
          if (filePath.includes(pubDir) && !filePath.endsWith("media-manifest.json")) {
            generateMediaManifest(rootDir);
            const relativePath = path.relative(pubDir, filePath);
            const folder = relativePath.split(path.sep)[0] || "";
            // Notify connected clients
            if (server.hot) {
              server.hot.send({
                type: "custom:media-folder-updated",
                data: { folder, file: relativePath },
              });
            } else if (server.ws) {
              server.ws.send({
                type: "custom:media-folder-updated",
                data: { folder, file: relativePath },
              });
            }
          }
        };

        server.watcher.on("add", watchHandler);
        server.watcher.on("unlink", watchHandler);
        server.watcher.on("change", watchHandler);
      }

      // API Endpoints
      server.middlewares.use((req, res, next) => {
        const parsedUrl = new URL(req.url, "http://localhost");

        // 1. Local folder scanner
        if (parsedUrl.pathname === "/api/media-folder") {
          const folder = parsedUrl.searchParams.get("folder") || "Creative visuals";
          const data = scanMediaFolder(pubDir, folder);

          res.statusCode = data?.success ? 200 : (data?.notFound ? 404 : 500);
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-cache");
          return res.end(JSON.stringify(data));
        }

        // 2. Available folders list
        if (parsedUrl.pathname === "/api/media-folders") {
          const folders = listAvailableMediaFolders(pubDir);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "no-cache");
          return res.end(JSON.stringify({ success: true, folders }));
        }

        // 3. High-performance Google Drive media proxy (prevents ORB & CORS blocks)
        if (parsedUrl.pathname === "/api/drive-media") {
          const id = parsedUrl.searchParams.get("id");
          const sz = parsedUrl.searchParams.get("sz") || "w1200";
          const isVideo = parsedUrl.searchParams.get("type") === "video";

          if (!id) {
            res.statusCode = 400;
            return res.end("Missing file id");
          }

          const targetUrl = isVideo
            ? `https://drive.google.com/uc?export=download&id=${id}`
            : `https://drive.google.com/thumbnail?id=${id}&sz=${sz}`;

          const fetchHeaders = {};
          if (req.headers.range) {
            fetchHeaders.Range = req.headers.range;
          }

          fetch(targetUrl, { headers: fetchHeaders })
            .then(async (driveRes) => {
              res.statusCode = driveRes.status;
              for (const [key, val] of driveRes.headers.entries()) {
                if (key.toLowerCase() !== "cache-control") {
                  res.setHeader(key, val);
                }
              }
              res.setHeader("Cache-Control", "public, max-age=86400");
              res.setHeader("Access-Control-Allow-Origin", "*");

              const stream = driveRes.body;
              if (stream) {
                const reader = stream.getReader();
                async function pump() {
                  const { done, value } = await reader.read();
                  if (done) {
                    res.end();
                    return;
                  }
                  res.write(value);
                  await pump();
                }
                return pump();
              } else {
                res.end();
              }
            })
            .catch((err) => {
              res.statusCode = 502;
              res.end(err.message);
            });
          return;
        }

        next();
      });
    },
  };
}
