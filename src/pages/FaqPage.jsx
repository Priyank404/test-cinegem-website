import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ServicePageLayout } from '@/components/shared/ServicePageLayout';
import { BackToVault } from '@/components/shared/BackToVault';
import TrailText from '@/components/shared/TrailText';
import { getConfirmedFaqCategories, parseInlineLinks } from '@/seo/faq';
import { CONTACT_EMAIL } from '@/seo/site';

function AnswerText({ text }) {
  const parts = useMemo(() => parseInlineLinks(text), [text]);

  return (
    <>
      {parts.map((part, idx) => {
        if (part.isLink) {
          return (
            <Link
              key={idx}
              to={part.url}
              className="text-white underline underline-offset-4 decoration-white/30 hover:decoration-white transition-colors duration-200 font-normal"
            >
              {part.text}
            </Link>
          );
        }
        return <span key={idx}>{part.text}</span>;
      })}
    </>
  );
}

export default function FaqPage() {
  const categories = useMemo(() => getConfirmedFaqCategories(), []);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Handle URL hash on mount & hashchange (open question and scroll)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) return;

      const targetQuestionId = hash.startsWith('q-') ? hash : `q-${hash}`;
      const questionEl = document.getElementById(targetQuestionId);
      if (questionEl && questionEl.tagName === 'DETAILS') {
        questionEl.open = true;
        setTimeout(() => {
          questionEl.scrollIntoView({ behavior: 'smooth' });
          const summary = questionEl.querySelector('summary');
          if (summary) summary.focus();
        }, 100);
        return;
      }

      const categoryEl = document.getElementById(hash);
      if (categoryEl) {
        setTimeout(() => {
          categoryEl.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const displayedCategories = useMemo(() => {
    if (selectedCategory === 'all') return categories;
    return categories.filter((c) => c.id === selectedCategory);
  }, [categories, selectedCategory]);

  const toggleAll = (openState) => {
    const allDetails = document.querySelectorAll('details.faq-question-item');
    allDetails.forEach((d) => {
      d.open = openState;
    });
  };

  return (
    <ServicePageLayout
      title="FAQ"
      seoKey="faq"
      currentPage="/faq"
      theme="dark"
      alwaysVisibleHeader={true}
    >
      <div className="w-full text-left select-text">
        {/* Header Typography */}
        <div className="flex flex-col items-start gap-2">
          <BackToVault light className="!mb-4" />
          <span className="font-[Poppins] text-[10px] sm:text-[11px] tracking-[0.25em] uppercase font-light text-[#FCFBFA]/50">
            Studio Knowledge Base
          </span>
          <TrailText
            open={true}
            as="h1"
            className="font-[Poppins] font-semibold text-[32px] sm:text-[44px] md:text-[54px] text-[#FCFBFA] leading-tight tracking-tight m-0"
          >
            Frequently Asked Questions
          </TrailText>
          <p className="font-[Poppins] font-light text-sm sm:text-base text-[#FCFBFA]/85 mt-2 mb-0 max-w-2xl leading-relaxed">
            Detailed guidance on high jewellery 3D CGI rendering, multi-angle e-commerce catalog suites, cinematic campaign films, and digital on-body compositing.
          </p>
        </div>

        {/* Unified FAQ Section in One Single Glassy Container */}
        <section className="w-full mt-10 md:mt-14" aria-label="Frequently Asked Questions">
          <div className="glassy-container p-5 sm:p-8 md:p-12 w-full">
            {/* Category Quick Filter Pills & Controls Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
              {/* Category Quick Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`rounded-full border text-[11px] tracking-[0.16em] uppercase px-3.5 py-1.5 transition-colors duration-200 font-[Poppins] ${
                    selectedCategory === 'all'
                      ? 'border-white/40 text-white bg-white/10 shadow-sm'
                      : 'border-white/15 text-[#FCFBFA]/60 hover:border-white/30 hover:text-white bg-transparent'
                  }`}
                >
                  All ({categories.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`rounded-full border text-[11px] tracking-[0.16em] uppercase px-3.5 py-1.5 transition-colors duration-200 font-[Poppins] ${
                      selectedCategory === cat.id
                        ? 'border-white/40 text-white bg-white/10 shadow-sm'
                        : 'border-white/15 text-[#FCFBFA]/60 hover:border-white/30 hover:text-white bg-transparent'
                    }`}
                  >
                    {cat.title.split('&')[0].trim()}
                  </button>
                ))}
              </div>

              {/* Expand / Collapse Controls */}
              <div className="flex items-center gap-3 self-end md:self-auto shrink-0 font-[Poppins] text-xs">
                <button
                  type="button"
                  onClick={() => toggleAll(true)}
                  className="text-[#FCFBFA]/60 hover:text-white transition-colors duration-200 underline underline-offset-4 decoration-white/20 hover:decoration-white"
                >
                  Expand all
                </button>
                <span className="text-white/20" aria-hidden="true">|</span>
                <button
                  type="button"
                  onClick={() => toggleAll(false)}
                  className="text-[#FCFBFA]/60 hover:text-white transition-colors duration-200 underline underline-offset-4 decoration-white/20 hover:decoration-white"
                >
                  Collapse all
                </button>
              </div>
            </div>

            {/* Clean Flush FAQ List */}
            <div className="mt-8 space-y-12 sm:space-y-16">
              {displayedCategories.map((category) => (
                <article
                  key={category.id}
                  id={category.id}
                  className="scroll-mt-28"
                  aria-labelledby={`cat-${category.id}`}
                >
                  {/* Category Header — Clean Flush Left Alignment */}
                  <div className="pb-3 border-b border-white/10">
                    <h2
                      id={`cat-${category.id}`}
                      className="font-[Poppins] text-xl sm:text-2xl md:text-3xl font-medium text-[#FCFBFA] m-0 tracking-tight"
                    >
                      {category.title}
                    </h2>
                  </div>

                  {/* Direct Question & Answer Accordion Items (no inner subcategories, no tree connector line) */}
                  <div className="space-y-3 mt-6">
                    {category.items.map((item) => (
                      <details
                        key={item.id}
                        id={`q-${item.id}`}
                        className="faq-question-item group border border-white/10 hover:border-white/20 rounded-lg p-4 sm:p-5 bg-white/[0.02] transition-colors scroll-mt-28"
                      >
                        <summary className="font-[Poppins] font-medium text-sm sm:text-base text-[#FCFBFA] cursor-pointer list-none flex justify-between items-center gap-4 select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded">
                          <span className="leading-snug">{item.question}</span>
                          <span
                            className="text-[#FCFBFA]/60 group-open:text-white text-xl font-light shrink-0 transition-transform duration-200 group-open:rotate-45"
                            aria-hidden="true"
                          >
                            +
                          </span>
                        </summary>
                        <div className="pb-2 pt-4 px-1 font-[Poppins] font-light text-sm sm:text-[15px] leading-relaxed text-[#FCFBFA]/85 border-t border-white/5 mt-3.5">
                          <AnswerText text={item.answer} />
                        </div>
                      </details>
                    ))}
                  </div>
                </article>
              ))}
            </div>

            {/* Bottom Quiet Inquire CTA */}
            <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 font-[Poppins]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm text-[#FCFBFA]/70 font-light">
                  Have a specific question about your collection or CAD files?
                </span>
                <Link
                  to="/inquire"
                  className="inline-flex items-center text-white hover:text-[#FCFBFA]/80 transition-colors duration-200 underline underline-offset-4 decoration-white/30 hover:decoration-white font-medium text-sm"
                >
                  Start a project with our studio team →
                </Link>
              </div>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-xs text-[#FCFBFA]/60 hover:text-white transition-colors duration-200 font-light"
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </div>
        </section>
      </div>
    </ServicePageLayout>
  );
}
