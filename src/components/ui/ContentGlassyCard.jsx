import React from "react";

export default function ContentGlassyCard({ children, className = "", style }) {
  return (
    <div className={`glassy-card glassy-content-card ${className}`} style={style}>
      {children}
    </div>
  );
}
