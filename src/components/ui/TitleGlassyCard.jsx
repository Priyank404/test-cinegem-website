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
    <div className={`glassy-card glassy-title-card p-4 sm:p-6 md:p-8 flex flex-col gap-2 sm:gap-3 ${className}`} style={style}>
      {subtitle && (
        <span className="text-[#C5A059] font-label text-[10px] tracking-[0.25em] uppercase font-semibold block">
          {subtitle}
        </span>
      )}
      {title && (
        <h2 className="font-[Poppins] font-semibold text-lg sm:text-2xl md:text-3xl text-[#FCFBFA] tracking-tight leading-tight m-0">
          {title}
        </h2>
      )}
      {description && (
        <p className="font-[Poppins] font-light text-[11px] sm:text-xs md:text-sm text-[#FCFBFA]/85 leading-relaxed m-0">
          {description}
        </p>
      )}
      {href && (
        <Link
          to={href}
          className="btn-primary pointer-events-auto cursor-pointer inline-flex items-center gap-2 py-1.5 px-3.5 sm:py-2.5 sm:px-5 text-[10px] sm:text-[11px] font-semibold tracking-widest uppercase rounded-md text-[#FCFBFA] hover:text-[#121212] transition-colors w-fit mt-0.5 sm:mt-1 text-decoration-none"
        >
          {linkText}
        </Link>
      )}
    </div>
  );
}
