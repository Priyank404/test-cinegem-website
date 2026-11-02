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
      className="w-full px-4 sm:px-6 md:px-8 lg:px-10 py-8 md:py-16 select-text"
    >
      <div className="w-full max-w-[1920px] 2xl:max-w-[2040px] mx-auto glassy-container">
        <div className="p-6 md:p-10 max-w-3xl text-left flex flex-col gap-3">
          {/* Gold Kicker */}
          <span className="font-[Poppins] text-[10px] tracking-[0.25em] uppercase font-light text-[#C5A059]">
            {content.kicker || 'Studio Notes'}
          </span>

          {/* Keyword-Bearing H2 */}
          <h2
            id="seo-studio-notes-heading"
            className="font-[Poppins] font-semibold text-2xl md:text-3xl text-[#FCFBFA] tracking-tight leading-snug m-0"
          >
            {content.heading}
          </h2>

          {/* Thin Gold Divider */}
          <div className="h-px w-16 bg-[#C5A059] my-1" aria-hidden="true" />

          {/* Intro Copy */}
          <p className="font-[Poppins] font-light text-sm md:text-[15px] leading-relaxed text-[#FCFBFA]/85 m-0">
            {content.intro}
          </p>

          {/* What You Receive */}
          <h3 className="font-[Poppins] font-semibold text-base sm:text-lg text-[#FCFBFA] mt-4 mb-1">
            {content.deliverablesTitle}
          </h3>
          <ul className="list-disc list-inside space-y-1.5 font-[Poppins] font-light text-sm md:text-[15px] leading-relaxed text-[#FCFBFA]/85 m-0 pl-1">
            {content.deliverables.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>

          {/* How It Works */}
          <h3 className="font-[Poppins] font-semibold text-base sm:text-lg text-[#FCFBFA] mt-4 mb-1">
            {content.processTitle}
          </h3>
          <p className="font-[Poppins] font-light text-sm md:text-[15px] leading-relaxed text-[#FCFBFA]/85 m-0">
            {content.process}
          </p>

          {/* Native Crawlable FAQs */}
          {content.faqs && content.faqs.length > 0 && (
            <div className="flex flex-col gap-2 mt-4">
              <h3 className="font-[Poppins] font-semibold text-base sm:text-lg text-[#FCFBFA] mb-1">
                Frequently Asked Questions
              </h3>
              {content.faqs.map((faq, idx) => (
                <details
                  key={idx}
                  className="group border border-white/10 rounded-lg p-3 bg-white/[0.02] transition-colors hover:border-white/20"
                >
                  <summary className="font-[Poppins] font-medium text-xs sm:text-sm text-[#FCFBFA] cursor-pointer outline-none list-none flex justify-between items-center gap-2">
                    <span>{faq.question}</span>
                    <span className="text-[#C5A059] text-sm group-open:rotate-180 transition-transform duration-300">
                      ↓
                    </span>
                  </summary>
                  <p className="font-[Poppins] font-light text-xs sm:text-[13px] leading-relaxed text-[#FCFBFA]/80 mt-2.5 pt-2 border-t border-white/5 m-0">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          )}

          {/* Internal Links Navigation */}
          {content.links && content.links.length > 0 && (
            <nav
              aria-label="Related studio services"
              className="flex flex-wrap items-center gap-4 mt-6 pt-4 border-t border-white/10 text-xs sm:text-[13px] font-[Poppins]"
            >
              <span className="text-[#FCFBFA]/60 font-light">Explore:</span>
              {content.links.map((link, idx) => (
                <Link
                  key={idx}
                  to={link.to}
                  className="text-[#C5A059] hover:text-white transition-colors duration-200 underline underline-offset-4 decoration-[#C5A059]/40 hover:decoration-white font-medium"
                >
                  {link.label} →
                </Link>
              ))}
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
