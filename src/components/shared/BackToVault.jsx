import { Link } from 'react-router-dom'

/**
 * BackToVault
 * A small arrow + label button that navigates back to the home vault.
 * Uses React Router <Link> so no full-page reload occurs.
 */
export function BackToVault({ className = '', light = false }) {
  const textColorClass = light
    ? 'text-[#FCFBFA] hover:text-[#C5A059]'
    : 'text-[#444748] hover:text-[#121212]'

  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2 mb-6 ${textColorClass} transition-colors duration-300 group w-fit ${className}`}
    >
      {/* Arrow icon */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="group-hover:-translate-x-1 transition-transform duration-300"
      >
        <path d="M19 12H5M5 12l7-7M5 12l7 7" />
      </svg>
      <span className="font-[Poppins] text-[12px] tracking-[0.15em] font-light uppercase">
        Back to Home
      </span>
    </Link>
  )
}
