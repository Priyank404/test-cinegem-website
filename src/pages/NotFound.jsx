import React from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '@/seo/useSeo';
import { BackToVault } from '@/components/shared/BackToVault';

export default function NotFound() {
  useSeo('notFound');

  return (
    <div
      className="min-h-screen w-full flex flex-col justify-center items-center text-center px-6 py-12 selection:bg-[#C5A059] selection:text-white"
      style={{ backgroundColor: '#0a0a0c', color: '#FCFBFA' }}
    >
      <div className="max-w-md mx-auto flex flex-col items-center gap-4">
        <BackToVault light className="!mb-2" />

        <span className="font-[Poppins] text-[10px] sm:text-[11px] tracking-[0.25em] uppercase text-[#C5A059] font-semibold">
          404 — Not Found
        </span>

        <h1 className="font-[Poppins] font-semibold text-3xl sm:text-4xl text-[#FCFBFA] tracking-tight">
          Page Not Found
        </h1>

        <p className="font-[Poppins] font-light text-sm sm:text-[15px] leading-relaxed text-[#FCFBFA]/85">
          The requested page does not exist or has been moved. Return to the vault to explore our fine jewellery collections.
        </p>

        <Link
          to="/"
          className="mt-4 px-6 py-2.5 border border-[#C5A059]/40 bg-[#C5A059]/10 text-[#C5A059] hover:bg-[#C5A059] hover:text-[#0a0a0c] transition-colors duration-300 rounded-md font-[Poppins] text-xs font-semibold tracking-widest uppercase"
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
