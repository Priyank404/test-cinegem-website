// src/lib/diagnostics.js
// Global diagnostic and error capture system for Cinegem Studio
// Enables on-screen debug reporting on mobile and desktop (?debug query param)

class DiagnosticBus {
  constructor() {
    this.logs = [];
    this.subscribers = new Set();
    this.rendererInfo = null;
    this.deviceTier = null;
    this.initErrorListeners();
  }

  initErrorListeners() {
    if (typeof window === "undefined") return;

    window.addEventListener("error", (event) => {
      this.recordLog({
        type: "error",
        source: "window.onerror",
        message: event.message || "Unknown error",
        filename: event.filename,
        lineno: event.lineno,
        stack: event.error?.stack,
        time: new Date().toLocaleTimeString(),
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      this.recordLog({
        type: "error",
        source: "unhandledrejection",
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        time: new Date().toLocaleTimeString(),
      });
    });
  }

  recordLog(entry) {
    this.logs.push(entry);
    if (this.logs.length > 50) this.logs.shift();
    this.notify();
  }

  logShaderError(gl, program, glVertexShader, glFragmentShader) {
    const programLog = gl ? gl.getProgramInfoLog(program) : "No gl context";
    const vertLog = gl && glVertexShader ? gl.getShaderInfoLog(glVertexShader) : "";
    const fragLog = gl && glFragmentShader ? gl.getShaderInfoLog(glFragmentShader) : "";

    console.error("Three.js Shader Compilation Error:", { programLog, vertLog, fragLog });
    this.recordLog({
      type: "shader-error",
      source: "renderer.debug.onShaderError",
      message: programLog || vertLog || fragLog || "Shader compilation/link failed",
      details: { programLog, vertLog, fragLog },
      time: new Date().toLocaleTimeString(),
    });
  }

  logContextLost(source = "WebGL") {
    console.warn(`[Diagnostics] Context lost on ${source}`);
    this.recordLog({
      type: "context-lost",
      source: `${source} Context Lost`,
      message: "GPU watchdog or memory overflow triggered webglcontextlost",
      time: new Date().toLocaleTimeString(),
    });
  }

  logAssetFailure(assetName, error) {
    console.warn(`[Diagnostics] Asset failed: ${assetName}`, error);
    this.recordLog({
      type: "asset-failure",
      source: `Asset: ${assetName}`,
      message: error?.message || String(error),
      stack: error?.stack,
      time: new Date().toLocaleTimeString(),
    });
  }

  setRendererInfo(info) {
    this.rendererInfo = info;
    this.notify();
  }

  setDeviceTier(tierInfo) {
    this.deviceTier = tierInfo;
    this.notify();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notify() {
    this.subscribers.forEach((cb) => {
      try {
        cb(this);
      } catch (err) {
        console.error("Diagnostics listener failed:", err);
      }
    });
  }

  getWebGLCapabilities() {
    if (typeof document === "undefined") return null;

    try {
      const canvas = document.createElement("canvas");
      let gl = canvas.getContext("webgl2");
      const isWebGL2 = Boolean(gl);
      if (!gl) {
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      }

      if (!gl) {
        return { supported: false, error: "WebGL completely unsupported" };
      }

      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : "Unknown Vendor";
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : "Unknown Renderer";
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);

      // Half float / float extension checks
      const extHalfFloat = Boolean(gl.getExtension("EXT_color_buffer_half_float"));
      const extFloat = Boolean(gl.getExtension("EXT_color_buffer_float"));
      const oesHalfFloatLinear = Boolean(gl.getExtension("OES_texture_half_float_linear"));
      const oesFloatLinear = Boolean(gl.getExtension("OES_texture_float_linear"));
      const extFloatBlend = Boolean(gl.getExtension("EXT_float_blend"));

      return {
        supported: true,
        version: isWebGL2 ? "WebGL 2.0" : "WebGL 1.0",
        vendor,
        renderer,
        maxTextureSize,
        extensions: {
          EXT_color_buffer_half_float: extHalfFloat,
          EXT_color_buffer_float: extFloat,
          OES_texture_half_float_linear: oesHalfFloatLinear,
          OES_texture_float_linear: oesFloatLinear,
          EXT_float_blend: extFloatBlend,
        },
      };
    } catch (e) {
      return { supported: false, error: String(e) };
    }
  }
}

export const diagnostics = new DiagnosticBus();
