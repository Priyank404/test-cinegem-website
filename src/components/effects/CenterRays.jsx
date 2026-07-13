import { useRef, useEffect, useState } from 'react';
import { Renderer, Program, Triangle, Mesh } from 'ogl';
import './CenterRays.css';

/**
 * CenterRays
 * -------------------------------------------------------------------------
 * A sunburst of light rays radiating outward from a point (default: the
 * center of the container) in every direction — think a star/sunburst,
 * not a single directional cone.
 *
 * This is a sibling to React Bits' LightRays, not a prop variant of it:
 * LightRays casts rays along ONE rayDir from an edge/corner anchor
 * (getAnchorAndDir has no "center" case, and the shader's rayStrength()
 * is built around a single reference direction). Faking an all-around
 * burst by pointing several LightRays instances at once would mean N
 * separate WebGL contexts. Instead this uses angular math — for each
 * pixel, the angle around the center point is compared against
 * `rayCount` evenly-spaced blades — so one shader produces the full
 * star with one canvas/context, same cost as a single LightRays layer.
 *
 * Same lifecycle/cleanup pattern as LightRays/SideRays (IntersectionObserver
 * gate, ogl Renderer, resize + mousemove listeners, WEBGL_lose_context on
 * unmount) so it drops in the same way.
 */

const hexToRgb = hex => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
};

const CenterRays = ({
  raysColor = '#ffffff',
  raysSpeed = 1,
  rayCount = 12,
  lightSpread = 1,
  rayLength = 1.2,
  pulsating = false,
  fadeDistance = 1.0,
  saturation = 1.0,
  center = [0.5, 0.5], // normalized [x, y] within the container
  followMouse = false,
  mouseInfluence = 0.1,
  noiseAmount = 0.0,
  distortion = 0.0,
  className = ''
}) => {
  const containerRef = useRef(null);
  const uniformsRef = useRef(null);
  const rendererRef = useRef(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const smoothMouseRef = useRef({ x: 0.5, y: 0.5 });
  const animationIdRef = useRef(null);
  const meshRef = useRef(null);
  const cleanupFunctionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    observerRef.current = new IntersectionObserver(
      entries => {
        const entry = entries[0];
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(containerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isVisible || !containerRef.current) return;

    if (cleanupFunctionRef.current) {
      cleanupFunctionRef.current();
      cleanupFunctionRef.current = null;
    }

    const initializeWebGL = async () => {
      if (!containerRef.current) return;

      await new Promise(resolve => setTimeout(resolve, 10));

      if (!containerRef.current) return;

      const renderer = new Renderer({
        dpr: Math.min(window.devicePixelRatio, 2),
        alpha: true
      });
      rendererRef.current = renderer;

      const gl = renderer.gl;
      gl.canvas.style.width = '100%';
      gl.canvas.style.height = '100%';

      while (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild);
      }
      containerRef.current.appendChild(gl.canvas);

      const vert = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

      const frag = `precision highp float;

uniform float iTime;
uniform vec2  iResolution;

uniform vec2  centerPos;
uniform vec3  raysColor;
uniform float raysSpeed;
uniform float rayCount;
uniform float lightSpread;
uniform float rayLength;
uniform float pulsating;
uniform float fadeDistance;
uniform float saturation;
uniform float rotationOffset;
uniform float noiseAmount;
uniform float distortion;

varying vec2 vUv;

float noise(vec2 st) {
  return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  vec2 rel = coord - centerPos;
  float dist = length(rel);
  float angle = atan(rel.y, rel.x) + rotationOffset;

  float distortedAngle = angle + distortion * sin(iTime * 2.0 + dist * 0.01) * 0.2;

  // N evenly-spaced blades around the circle, softened by lightSpread.
  float blade = abs(sin(distortedAngle * rayCount * 0.5 + iTime * raysSpeed * 0.2));
  float spreadFactor = pow(blade, 1.0 / max(lightSpread, 0.001));

  // A slower secondary harmonic adds texture/flicker within each blade,
  // echoing LightRays' two-layer rayStrength blend.
  float shimmer = clamp(
    (0.55 + 0.15 * sin(distortedAngle * 14.0 + iTime * raysSpeed)) +
    (0.3 + 0.15 * cos(-distortedAngle * 9.0 + iTime * raysSpeed * 0.7)),
    0.0, 1.0
  );

  float minDim = min(iResolution.x, iResolution.y);
  float maxDistance = minDim * rayLength;
  float lengthFalloff = clamp((maxDistance - dist) / maxDistance, 0.0, 1.0);
  float fadeFalloff = clamp((minDim * fadeDistance - dist) / (minDim * fadeDistance), 0.5, 1.0);
  float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * raysSpeed * 3.0)) : 1.0;

  // Soft hole right at the center so it reads as rays FROM a point,
  // not a filled disc.
  float core = smoothstep(0.0, minDim * 0.02, dist);

  float strength = spreadFactor * shimmer * lengthFalloff * fadeFalloff * pulse * core;

  vec4 fragColorOut = vec4(1.0) * strength;

  if (noiseAmount > 0.0) {
    float n = noise(coord * 0.01 + iTime * 0.1);
    fragColorOut.rgb *= (1.0 - noiseAmount + noiseAmount * n);
  }

  if (saturation != 1.0) {
    float gray = dot(fragColorOut.rgb, vec3(0.299, 0.587, 0.114));
    fragColorOut.rgb = mix(vec3(gray), fragColorOut.rgb, saturation);
  }

  fragColorOut.rgb *= raysColor;
  fragColor = fragColorOut;
}

void main() {
  vec4 color;
  mainImage(color, gl_FragCoord.xy);
  gl_FragColor = color;
}`;

      const uniforms = {
        iTime: { value: 0 },
        iResolution: { value: [1, 1] },
        centerPos: { value: [0, 0] },
        raysColor: { value: hexToRgb(raysColor) },
        raysSpeed: { value: raysSpeed },
        rayCount: { value: rayCount },
        lightSpread: { value: lightSpread },
        rayLength: { value: rayLength },
        pulsating: { value: pulsating ? 1.0 : 0.0 },
        fadeDistance: { value: fadeDistance },
        saturation: { value: saturation },
        rotationOffset: { value: 0 },
        noiseAmount: { value: noiseAmount },
        distortion: { value: distortion }
      };
      uniformsRef.current = uniforms;

      const geometry = new Triangle(gl);
      const program = new Program(gl, {
        vertex: vert,
        fragment: frag,
        uniforms
      });
      const mesh = new Mesh(gl, { geometry, program });
      meshRef.current = mesh;

      const updatePlacement = () => {
        if (!containerRef.current || !renderer) return;

        renderer.dpr = Math.min(window.devicePixelRatio, 2);

        const { clientWidth: wCSS, clientHeight: hCSS } = containerRef.current;
        renderer.setSize(wCSS, hCSS);

        const dpr = renderer.dpr;
        const w = wCSS * dpr;
        const h = hCSS * dpr;

        uniforms.iResolution.value = [w, h];
        uniforms.centerPos.value = [center[0] * w, (1 - center[1]) * h];
      };

      const loop = t => {
        if (!rendererRef.current || !uniformsRef.current || !meshRef.current) {
          return;
        }

        uniforms.iTime.value = t * 0.001;

        if (followMouse && mouseInfluence > 0.0) {
          const smoothing = 0.92;

          smoothMouseRef.current.x = smoothMouseRef.current.x * smoothing + mouseRef.current.x * (1 - smoothing);
          smoothMouseRef.current.y = smoothMouseRef.current.y * smoothing + mouseRef.current.y * (1 - smoothing);

          // Rotate the whole burst toward the mouse angle (relative to
          // container center) rather than bending a single rayDir —
          // there's no single direction to bend here.
          const dx = smoothMouseRef.current.x - 0.5;
          const dy = 0.5 - smoothMouseRef.current.y;
          const targetAngle = Math.atan2(dy, dx);
          uniforms.rotationOffset.value = targetAngle * mouseInfluence;
        }

        try {
          renderer.render({ scene: mesh });
          animationIdRef.current = requestAnimationFrame(loop);
        } catch (error) {
          console.warn('WebGL rendering error:', error);
          return;
        }
      };

      window.addEventListener('resize', updatePlacement);
      updatePlacement();
      animationIdRef.current = requestAnimationFrame(loop);

      cleanupFunctionRef.current = () => {
        if (animationIdRef.current) {
          cancelAnimationFrame(animationIdRef.current);
          animationIdRef.current = null;
        }

        window.removeEventListener('resize', updatePlacement);

        if (renderer) {
          try {
            const canvas = renderer.gl.canvas;
            const loseContextExt = renderer.gl.getExtension('WEBGL_lose_context');
            if (loseContextExt) {
              loseContextExt.loseContext();
            }

            if (canvas && canvas.parentNode) {
              canvas.parentNode.removeChild(canvas);
            }
          } catch (error) {
            console.warn('Error during WebGL cleanup:', error);
          }
        }

        rendererRef.current = null;
        uniformsRef.current = null;
        meshRef.current = null;
      };
    };

    initializeWebGL();

    return () => {
      if (cleanupFunctionRef.current) {
        cleanupFunctionRef.current();
        cleanupFunctionRef.current = null;
      }
    };
  }, [
    isVisible,
    raysColor,
    raysSpeed,
    rayCount,
    lightSpread,
    rayLength,
    pulsating,
    fadeDistance,
    saturation,
    center,
    followMouse,
    mouseInfluence,
    noiseAmount,
    distortion
  ]);

  useEffect(() => {
    if (!uniformsRef.current || !containerRef.current || !rendererRef.current) return;

    const u = uniformsRef.current;
    const renderer = rendererRef.current;

    u.raysColor.value = hexToRgb(raysColor);
    u.raysSpeed.value = raysSpeed;
    u.rayCount.value = rayCount;
    u.lightSpread.value = lightSpread;
    u.rayLength.value = rayLength;
    u.pulsating.value = pulsating ? 1.0 : 0.0;
    u.fadeDistance.value = fadeDistance;
    u.saturation.value = saturation;
    u.noiseAmount.value = noiseAmount;
    u.distortion.value = distortion;

    const { clientWidth: wCSS, clientHeight: hCSS } = containerRef.current;
    const dpr = renderer.dpr;
    const w = wCSS * dpr;
    const h = hCSS * dpr;
    u.centerPos.value = [center[0] * w, (1 - center[1]) * h];
  }, [
    raysColor,
    raysSpeed,
    rayCount,
    lightSpread,
    rayLength,
    pulsating,
    fadeDistance,
    saturation,
    center,
    noiseAmount,
    distortion
  ]);

  useEffect(() => {
    const handleMouseMove = e => {
      if (!containerRef.current || !rendererRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      mouseRef.current = { x, y };
    };

    if (followMouse) {
      window.addEventListener('mousemove', handleMouseMove);
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [followMouse]);

  return <div ref={containerRef} className={`center-rays-container ${className}`.trim()} />;
};

export default CenterRays;
