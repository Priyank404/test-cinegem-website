// src/components/three/Hero3DFallback.jsx
// Error Boundary for Cinegem Studio 3D scene
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
      return null;
    }
    return this.props.children;
  }
}

export function Hero3DFallbackPoster() {
  return null;
}

export default Hero3DFallbackPoster;


