import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

self.onmessage = function (e) {
  const { id, buffer, mono = true, dataType = "HalfFloatType" } = e.data;
  try {
    const loader = new EXRLoader();
    if (dataType === "HalfFloatType") {
      loader.setDataType(THREE.HalfFloatType);
    }
    // Match native hdrLoader.js line 88: decode directly to RedFormat during scanline parse
    loader.outputFormat = mono ? THREE.RedFormat : THREE.RGBAFormat;

    const parsed = loader.parse(buffer);
    const width = parsed.width;
    const height = parsed.height;
    const format = mono ? "RedFormat" : "RGBAFormat";

    self.postMessage(
      {
        id,
        success: true,
        width,
        height,
        format,
        dataType,
        data: parsed.data,
      },
      [parsed.data.buffer]
    );
  } catch (err) {
    self.postMessage({
      id,
      success: false,
      error: err?.message || String(err),
    });
  }
};
