import * as THREE from "three";
import { EXRLoader } from "three/examples/jsm/loaders/EXRLoader.js";

self.onmessage = function (e) {
  const { id, buffer, mono = true, dataType = "HalfFloatType" } = e.data;
  try {
    const loader = new EXRLoader();
    if (dataType === "HalfFloatType") {
      loader.setDataType(THREE.HalfFloatType);
    }

    const parsed = loader.parse(buffer);
    const width = parsed.width;
    const height = parsed.height;

    let outputData;
    let format;

    if (mono) {
      // Pack RGBA half-float data (4 channels) down to single-channel RedFormat
      const pixelCount = width * height;
      const monoData = new Uint16Array(pixelCount);
      const srcData = parsed.data;
      for (let i = 0; i < pixelCount; i++) {
        monoData[i] = srcData[i * 4];
      }
      outputData = monoData;
      format = "RedFormat";
    } else {
      outputData = parsed.data;
      format = "RGBAFormat";
    }

    self.postMessage(
      {
        id,
        success: true,
        width,
        height,
        format,
        dataType,
        data: outputData,
      },
      [outputData.buffer]
    );
  } catch (err) {
    self.postMessage({
      id,
      success: false,
      error: err?.message || String(err),
    });
  }
};
