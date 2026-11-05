// src/components/three/Hero3DFallback.jsx
// Error Boundary and fallback poster renderer for Cinegem Studio 3D scene
import React from "react";
import { diagnostics } from "@/lib/diagnostics";

export class Hero3DErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[Hero3DErrorBoundary] Caught fatal Three.js error:", error, errorInfo);
    diagnostics.recordLog({
      type: "fatal-3d-error",
      source: "Hero3DErrorBoundary",
      message: error?.message || String(error),
      stack: error?.stack,
      time: new Date().toLocaleTimeString(),
    });
  }

  render() {
    if (this.state.hasError) {
      return <Hero3DFallbackPoster message="Interactive 3D degraded gracefully" />;
    }
    return this.props.children;
  }
}

export function Hero3DFallbackPoster({ message = "" }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        background: "radial-gradient(circle at 50% 50%, rgba(30, 24, 38, 0.45) 0%, rgba(10, 10, 14, 0.95) 100%)",
      }}
    >
      <img
        src="/ring_gallery_1.png"
        alt="Cinegem Luxury Ring"
        style={{
          width: "min(75vw, 480px)",
          height: "auto",
          objectFit: "contain",
          filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.8))",
          transform: "scale(1.05)",
          animation: "heroFallbackPulse 4s ease-in-out infinite alternate",
        }}
        onError={(e) => {
          // If ring_gallery_1 is missing, try ring.png
          if (!e.currentTarget.dataset.retried) {
            e.currentTarget.dataset.retried = "true";
            e.currentTarget.src = "/ring.png";
          }
        }}
      />
      <style>{`
        @keyframes heroFallbackPulse {
          0% { transform: scale(1.02) rotate(-1deg); }
          100% { transform: scale(1.06) rotate(1deg); }
        }
      `}</style>
      {message && (
        <span
          style={{
            position: "absolute",
            bottom: 24,
            fontSize: 11,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontFamily: "Poppins, sans-serif",
          }}
        >
          {message}
        </span>
      )}
    </div>
  );
}

export default Hero3DFallbackPoster;
