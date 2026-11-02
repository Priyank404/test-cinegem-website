import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ServicePageLayout } from '@/components/shared/ServicePageLayout';
import { BackToVault } from '@/components/shared/BackToVault';
import TrailText from '@/components/shared/TrailText';
import { getConfirmedFaqTree, parseInlineLinks } from '@/seo/faq';
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
              className="text-[#C5A059] underline underline-offset-4 decoration-[#C5A059]/50 hover:text-white hover:decoration-white transition-colors duration-200 font-normal"
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
  const tree = useMemo(() => getConfirmedFaqTree(), []);
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
    if (selectedCategory === 'all') return tree;
    return tree.filter((c) => c.id === selectedCategory);
  }, [tree, selectedCategory]);

  const toggleAll = (openState) => {
    const allDetails = document.querySelectorAll('details.faq-question-item');
    allDetails.forEach((d) => {
      d.open = openState;
    });
  };

  return (
    <ServicePageLayout title="FAQ" seoKey="faq" currentPage="/faq" theme="dark">
      <div className="w-full text-left select-text">
        {/* Header Header */}
        <div className="flex flex-col items-start gap-2">
          <BackToVault light className="!mb-4" />
          <span className="font-[Poppins] text-[10px] tracking-[0.25em] uppercase font-light text-[#C5A059]">
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
            Detailed guidance on high jewellery 3D path-tracing, multi-angle e-commerce catalog suites, cinematic campaign CGI, and digital on-body compositing.
          </p>
        </div>

        {/* Unified FAQ Section in One Single Glassy Container */}
        <section className="w-full mt-10 md:mt-14" aria-label="Frequently Asked Questions">
          <div className="glassy-container p-5 sm:p-8 md:p-12 w-full">
            {/* Tree Navigation & Controls Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
              {/* Category Quick Filter Pills (Level 1 Navigator) */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`rounded-full border text-[11px] tracking-[0.16em] uppercase px-3.5 py-1.5 transition-colors duration-200 font-[Poppins] ${
                    selectedCategory === 'all'
                      ? 'border-[#C5A059] text-[#C5A059] bg-[#C5A059]/10'
                      : 'border-white/20 text-[#FCFBFA]/70 hover:border-[#C5A059] hover:text-[#C5A059]'
                  }`}
                >
                  All ({tree.length})
                </button>
                {tree.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`rounded-full border text-[11px] tracking-[0.16em] uppercase px-3.5 py-1.5 transition-colors duration-200 font-[Poppins] ${
                      selectedCategory === cat.id
                        ? 'border-[#C5A059] text-[#C5A059] bg-[#C5A059]/10'
                        : 'border-white/20 text-[#FCFBFA]/70 hover:border-[#C5A059] hover:text-[#C5A059]'
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
                  className="text-[#FCFBFA]/60 hover:text-[#C5A059] transition-colors duration-200 underline underline-offset-4 decoration-white/20 hover:decoration-[#C5A059]"
                >
                  Expand all
                </button>
                <span className="text-white/20" aria-hidden="true">|</span>
                <button
                  type="button"
                  onClick={() => toggleAll(false)}
                  className="text-[#FCFBFA]/60 hover:text-[#C5A059] transition-colors duration-200 underline underline-offset-4 decoration-white/20 hover:decoration-[#C5A059]"
                >
                  Collapse all
                </button>
              </div>
            </div>

            {/* 3-Level FAQ Tree Structure */}
            <div className="mt-8 space-y-12">
              {displayedCategories.map((category) => (
                <article
                  key={category.id}
                  id={category.id}
                  className="scroll-mt-28 relative"
                  aria-labelledby={`cat-${category.id}`}
                >
                  {/* LEVEL 1: Category Header */}
                  <div className="flex items-start sm:items-center justify-between gap-4 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="font-[Poppins] text-[11px] tracking-[0.2em] uppercase font-light text-[#C5A059] border border-[#C5A059]/30 rounded px-2 py-0.5">
                        {category.badge}
                      </span>
                      <h2
                        id={`cat-${category.id}`}
                        className="font-[Poppins] text-xl sm:text-2xl md:text-3xl font-semibold text-[#FCFBFA] m-0 tracking-tight"
                      >
                        {category.title}
                      </h2>
                    </div>
                  </div>
                  <p className="font-[Poppins] font-light text-xs sm:text-sm text-[#FCFBFA]/70 mt-2 mb-6">
                    {category.summary}
                  </p>

                  {/* LEVEL 2 & 3: Tree Connector Branch */}
                  <div className="border-l-2 border-[#C5A059]/30 pl-4 sm:pl-8 ml-2 sm:ml-4 space-y-8">
                    {category.subcategories.map((sub) => (
                      <div key={sub.id} className="relative">
                        {/* LEVEL 2: Subcategory Node Header */}
                        <div className="flex items-center gap-2.5 mb-4 -ml-4 sm:-ml-8">
                          <span
                            className="w-2.5 h-2.5 rounded-full bg-[#C5A059] ring-4 ring-[#0a0a0c] shrink-0"
                            aria-hidden="true"
                          />
                          <h3 className="font-[Poppins] text-xs sm:text-[13px] font-semibold tracking-[0.18em] uppercase text-[#C5A059] m-0">
                            {sub.title}
                          </h3>
                        </div>

                        {/* LEVEL 3: Question & Answer Accordion Items */}
                        <div className="space-y-2.5 pl-2 sm:pl-4">
                          {sub.items.map((item) => (
                            <details
                              key={item.id}
                              id={`q-${item.id}`}
                              className="faq-question-item group border border-white/10 hover:border-white/25 rounded-lg p-3.5 sm:p-4 bg-white/[0.02] transition-colors scroll-mt-28"
                            >
                              <summary className="font-[Poppins] font-medium text-sm sm:text-[15px] text-[#FCFBFA] cursor-pointer list-none flex justify-between items-center gap-4 select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A059] rounded">
                                <span className="leading-snug">{item.question}</span>
                                <span
                                  className="text-[#C5A059] text-xl font-light shrink-0 transition-transform duration-200 group-open:rotate-45"
                                  aria-hidden="true"
                                >
                                  +
                                </span>
                              </summary>
                              <div className="pb-2 pt-3 px-1 font-[Poppins] font-light text-sm sm:text-[15px] leading-relaxed text-[#FCFBFA]/85 border-t border-white/5 mt-3">
                                <AnswerText text={item.answer} />
                              </div>
                            </details>
                          ))}
                        </div>
                      </div>
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
                  className="inline-flex items-center text-[#C5A059] hover:text-white transition-colors duration-200 underline underline-offset-4 decoration-[#C5A059]/40 hover:decoration-white font-medium text-sm"
                >
                  Start a project with our studio team →
                </Link>
              </div>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="text-xs text-[#FCFBFA]/60 hover:text-[#C5A059] transition-colors duration-200 font-light"
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
