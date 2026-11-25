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
  children,
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
      {children}
      {href && (
        <Link
          to={href}
          className="pointer-events-auto cursor-pointer inline-flex items-center gap-2 py-2 px-5 sm:py-2.5 sm:px-6 text-[10.5px] sm:text-[11.5px] font-semibold tracking-widest uppercase rounded-lg text-[#FCFBFA] hover:text-white bg-white/12 hover:bg-white/24 border border-white/28 hover:border-white/50 shadow-[0_4px_14px_rgba(0,0,0,0.35)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.45)] backdrop-blur-md hover:-translate-y-0.5 transition-all duration-200 w-fit mt-1.5 sm:mt-2 text-decoration-none"
        >
          {linkText}
        </Link>
      )}
    </div>
  );
}
