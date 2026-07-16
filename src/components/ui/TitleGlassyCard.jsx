import React from "react";

export default function TitleGlassyCard({ title, subtitle, className = "", style }) {
  return (
    <div className={`glassy-card glassy-title-card ${className}`} style={style}>
      {subtitle && <h3>{subtitle}</h3>}
      {title && <h2>{title}</h2>}
    </div>
  );
}
