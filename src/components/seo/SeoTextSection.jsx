import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import { useSeoTextVisibility } from '@/seo/useSeoTextVisibility';
import { SEO_CONTENT } from '@/seo/content';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SeoTextSection caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

function SeoTextContent({ contentKey }) {
  const { isVisible } = useSeoTextVisibility();
  const content = SEO_CONTENT[contentKey];

  if (!isVisible || !content) {
    return null;
  }

  return (
    <section
      aria-labelledby="seo-studio-notes-heading"
      className="w-full px-4 sm:px-6 md:px-8 lg:px-10 pt-5 pb-5 md:pt-6 md:pb-6 bg-[#0a0a0c]/70 backdrop-blur-md select-text transition-opacity duration-300"
    >
      <div className="mx-auto max-w-[1920px] 2xl:max-w-[2040px] border-t border-white/10 pt-4 md:pt-4 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
        {/* Left Column (5 cols) */}
        <div className="md:col-span-5 text-left flex flex-col gap-1.5">
          <span className="font-[Poppins] text-[10px] tracking-[0.25em] uppercase font-light text-[#C5A059]">
            {content.kicker || 'Studio Notes'}
          </span>
          <h2
            id="seo-studio-notes-heading"
            className="font-[Poppins] font-semibold text-xl md:text-2xl text-[#FCFBFA] leading-snug m-0"
          >
            {content.heading}
          </h2>
        </div>

        {/* Right Column (7 cols) */}
        <div className="md:col-span-7 text-left flex flex-col gap-2">
          <p className="font-[Poppins] font-light text-sm leading-relaxed text-[#FCFBFA]/80 m-0">
            {content.intro}
          </p>

          {content.deliverables && content.deliverables.length > 0 && (
            <ul className="space-y-1 m-0 p-0 list-none">
              {content.deliverables.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 font-[Poppins] font-light text-sm leading-relaxed text-[#FCFBFA]/80"
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full bg-[#C5A059] mt-2 shrink-0"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}

          {content.process && (
            <p className="font-[Poppins] font-light text-sm leading-relaxed text-[#FCFBFA]/80 m-0">
              {content.process}
            </p>
          )}

          {content.links && content.links.length > 0 && (
            <nav
              aria-label="Related studio links"
              className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-1.5 border-t border-white/5 font-[Poppins]"
            >
              {content.links.map((link, idx) => {
                if (link.isFaq) {
                  return (
                    <Link
                      key={idx}
                      to={link.to}
                      className="text-[#C5A059] hover:text-white transition-colors duration-200 underline underline-offset-4 decoration-[#C5A059]/40 hover:decoration-white font-medium text-sm"
                    >
                      {link.label} →
                    </Link>
                  );
                }
                return (
                  <Link
                    key={idx}
                    to={link.to}
                    className="text-[#FCFBFA]/70 hover:text-white transition-colors duration-200 underline underline-offset-4 decoration-white/20 hover:decoration-white text-xs font-light"
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </div>
    </section>
  );
}

export default function SeoTextSection({ contentKey }) {
  return (
    <ErrorBoundary>
      <SeoTextContent contentKey={contentKey} />
    </ErrorBoundary>
  );
}
