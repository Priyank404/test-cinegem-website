import React from "react";
import { Link } from "react-router-dom";

export default function TitleGlassyCard({
  title,
  subtitle,
  description,
  href,
  linkText = "EXPLORE →",
  className = "",
  style,
}) {
  return (
    <div className={`glassy-card glassy-title-card p-6 md:p-8 flex flex-col gap-3 ${className}`} style={style}>
      {subtitle && (
        <span className="text-[#C5A059] font-label text-[10px] tracking-[0.25em] uppercase font-semibold block">
          {subtitle}
        </span>
      )}
      {title && (
        <h2 className="font-[Poppins] font-semibold text-2xl md:text-3xl text-[#FCFBFA] tracking-tight leading-tight m-0">
          {title}
        </h2>
      )}
      {description && (
        <p className="font-[Poppins] font-light text-xs md:text-sm text-[#FCFBFA]/85 leading-relaxed m-0">
          {description}
        </p>
      )}
      {href && (
        <Link
          to={href}
          className="btn-primary inline-flex items-center gap-2 py-2.5 px-5 text-[11px] font-semibold tracking-widest uppercase rounded-md text-[#FCFBFA] hover:text-[#121212] transition-colors w-fit mt-1 text-decoration-none"
        >
          {linkText}
        </Link>
      )}
    </div>
  );
}
