import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSeoTextVisibility } from '@/seo/useSeoTextVisibility';

export default function SeoTextToggle({ pageName = '' }) {
  const [mounted, setMounted] = useState(false);
  const { isVisible, toggle } = useSeoTextVisibility();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Global build-time kill switch: VITE_SEO_TEXT_BUTTON=false hides the button
  const buttonEnabled =
    (typeof process !== 'undefined' && process.env && process.env.VITE_SEO_TEXT_BUTTON !== 'false') &&
    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_SEO_TEXT_BUTTON !== 'false');

  if (!buttonEnabled) return null;
  if (!mounted || typeof document === 'undefined') return null;

  const titleText = isVisible
    ? `Switch to Original View (hide studio notes) for ${pageName || 'this page'}`
    : `Show Studio Notes for ${pageName || 'this page'}`;

  const content = (
    <aside
      aria-label="Studio notes display toggle"
      className="fixed bottom-[72px] right-5 sm:bottom-6 sm:right-6 z-[99999] pointer-events-auto select-none"
    >
      <button
        type="button"
        onClick={() => toggle()}
        title={titleText}
        aria-label={titleText}
        aria-pressed={!isVisible}
        className={`
          group flex items-center gap-2.5 px-4 py-2.5 sm:px-5 sm:py-3 rounded-full
          font-['Poppins',sans-serif] text-[11px] sm:text-[12px] font-medium tracking-[0.16em] uppercase
          transition-all duration-300 cursor-pointer
          backdrop-blur-2xl active:scale-95 hover:scale-[1.04] focus:outline-none focus:ring-2 focus:ring-[#C5A059]
          ${
            isVisible
              ? 'bg-[#0e0e12]/95 hover:bg-[#16161c] text-white border border-[#C5A059]/50 hover:border-[#C5A059] shadow-[0_12px_36px_rgba(0,0,0,0.8),0_0_20px_rgba(197,160,89,0.25)]'
              : 'bg-[#C5A059] hover:bg-[#d6af63] text-black font-semibold border border-[#e8c783] shadow-[0_12px_36px_rgba(197,160,89,0.5)]'
          }
        `}
      >
        {/* Toggle Icon */}
        {isVisible ? (
          <svg
            className="w-4 h-4 text-[#C5A059] group-hover:rotate-180 transition-transform duration-500 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          <svg
            className="w-4 h-4 text-black shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        )}

        {/* Dynamic Label */}
        <span className="whitespace-nowrap drop-shadow-sm">
          {isVisible ? 'Original View' : 'Show Studio Notes'}
        </span>

        {/* Status Indicator */}
        <span
          className={`w-2 h-2 rounded-full transition-all shrink-0 ${
            isVisible
              ? 'bg-[#C5A059] shadow-[0_0_8px_#C5A059] animate-pulse'
              : 'bg-black shadow-[0_0_6px_rgba(0,0,0,0.6)]'
          }`}
        />
      </button>
    </aside>
  );

  return createPortal(content, document.body);
}
