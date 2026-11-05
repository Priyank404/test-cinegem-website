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
      return <Hero3DFallbackPoster message="2D Mode" technicalError={this.state.error?.message} />;
    }
    return this.props.children;
  }
}

export function Hero3DFallbackPoster({ message = "2D Mode", technicalError = "" }) {
  const isDebug = typeof window !== "undefined" && window.location.search.includes("debug");
  const displayMessage = isDebug && technicalError
    ? `2D Fallback: ${technicalError}`
    : message;

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
      <picture>
        <source srcSet="/hero-poster.webp" type="image/webp" />
        <img
          src="/hero-poster.jpg"
          alt="Cinegem Luxury Ring"
          width="1200"
          height="1200"
          decoding="async"
          style={{
            width: "min(75vw, 480px)",
            height: "auto",
            objectFit: "contain",
            filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.8))",
            transform: "scale(1.05)",
            animation: "heroFallbackPulse 4s ease-in-out infinite alternate",
          }}
          onError={(e) => {
            // Hide img tag on error so no broken image icon is ever displayed
            e.currentTarget.style.display = "none";
          }}
        />
      </picture>
      <style>{`
        @keyframes heroFallbackPulse {
          0% { transform: scale(1.02) rotate(-1deg); }
          100% { transform: scale(1.06) rotate(1deg); }
        }
      `}</style>
      {displayMessage && (
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
          {displayMessage}
        </span>
      )}
    </div>
  );
}

export default Hero3DFallbackPoster;


