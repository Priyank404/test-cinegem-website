import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ServicePageLayout } from '@/components/shared/ServicePageLayout';
import { BackToVault } from '@/components/shared/BackToVault';
import TrailText from '@/components/shared/TrailText';
import { getConfirmedFaqSections, parseInlineLinks } from '@/seo/faq';
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
  const sections = useMemo(() => getConfirmedFaqSections(), []);
  const [activeSection, setActiveSection] = useState(sections[0]?.id || 'studio');

  // Handle URL hash on initial mount and hashchange (open question and scroll)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) return;

      // Check if hash matches a question id
      const targetQuestionId = hash.startsWith('q-') ? hash : `q-${hash}`;
      const questionEl = document.getElementById(targetQuestionId);
      if (questionEl && questionEl.tagName === 'DETAILS') {
        questionEl.open = true;
        setTimeout(() => {
          questionEl.scrollIntoView({ behavior: 'smooth' });
          const summary = questionEl.querySelector('summary');
          if (summary) summary.focus();
        }, 80);
        return;
      }

      // Check if hash matches a section / category id
      const sectionEl = document.getElementById(hash);
      if (sectionEl) {
        setTimeout(() => {
          sectionEl.scrollIntoView({ behavior: 'smooth' });
        }, 80);
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // IntersectionObserver to highlight active category in navigation
  useEffect(() => {
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
            break;
          }
        }
      },
      {
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0,
      }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sections]);

  return (
    <ServicePageLayout title="FAQ" seoKey="faq" currentPage="/faq" theme="dark">
      <div className="w-full text-left select-text">
        {/* Top of Page */}
        <div className="flex flex-col items-start gap-2">
          <BackToVault light className="!mb-4" />
          <span className="font-[Poppins] text-[10px] tracking-[0.25em] uppercase font-light text-[#C5A059]">
            FAQ
          </span>
          <TrailText
            open={true}
            as="h1"
            className="font-[Poppins] font-semibold text-[30px] sm:text-[40px] md:text-[50px] text-[#FCFBFA] leading-tight tracking-tight m-0"
          >
            Frequently Asked Questions
          </TrailText>
          <p className="font-[Poppins] font-light text-sm md:text-[15px] text-[#FCFBFA]/85 mt-2 mb-0">
            Everything about working with Cinegem Studio, by service.
          </p>
        </div>

        {/* Mobile Pills Navigation (< lg) */}
        <div className="lg:hidden flex flex-wrap gap-2 mt-8 mb-6">
          {sections.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className={`rounded-full border text-[11px] tracking-[0.16em] uppercase px-4 py-2 transition-colors duration-200 font-[Poppins] ${
                activeSection === section.id
                  ? 'border-[#C5A059] text-[#C5A059] bg-[#C5A059]/10'
                  : 'border-white/20 text-[#FCFBFA]/80 hover:border-[#C5A059] hover:text-[#C5A059]'
              }`}
            >
              {section.title}
            </a>
          ))}
        </div>

        {/* Desktop 12-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 mt-8 lg:mt-12">
          {/* Left Index (3 cols, sticky) */}
          <aside className="hidden lg:block lg:col-span-3">
            <nav
              aria-label="FAQ sections"
              className="lg:sticky lg:top-28 flex flex-col gap-3 py-2"
            >
              <span className="font-[Poppins] text-[10px] tracking-[0.25em] uppercase text-[#C5A059] font-light mb-1">
                Categories
              </span>
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={`flex items-center gap-2 font-[Poppins] text-[12px] tracking-[0.15em] uppercase font-light transition-colors duration-200 ${
                    activeSection === section.id
                      ? 'text-[#C5A059]'
                      : 'text-[#FCFBFA]/60 hover:text-[#FCFBFA]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-colors duration-200 shrink-0 ${
                      activeSection === section.id ? 'bg-[#C5A059]' : 'bg-transparent'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{section.title}</span>
                </a>
              ))}
            </nav>
          </aside>

          {/* Right Question Lists (9 cols) */}
          <div className="lg:col-span-9 flex flex-col gap-10 md:gap-14">
            {sections.map((section, idx) => (
              <section
                key={section.id}
                id={section.id}
                aria-labelledby={`heading-${section.id}`}
                className="scroll-mt-28 flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-[Poppins] text-[10px] tracking-[0.25em] uppercase text-[#C5A059] font-light">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <h2
                    id={`heading-${section.id}`}
                    className="font-[Poppins] text-2xl md:text-3xl font-semibold text-[#FCFBFA] m-0"
                  >
                    {section.title}
                  </h2>
                </div>

                <div className="glassy-container p-2 md:p-4">
                  {section.items.map((item) => (
                    <details
                      key={item.id}
                      id={`q-${item.id}`}
                      className="group border-b border-white/10 last:border-b-0 scroll-mt-28"
                    >
                      <summary className="font-[Poppins] font-medium text-sm md:text-[15px] text-[#FCFBFA] py-4 px-2 md:px-3 cursor-pointer list-none flex justify-between items-center gap-4 select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-[#C5A059] rounded">
                        <span>{item.question}</span>
                        <span
                          className="text-[#C5A059] text-xl font-light shrink-0 transition-transform duration-200 group-open:rotate-45"
                          aria-hidden="true"
                        >
                          +
                        </span>
                      </summary>
                      <div className="pb-4 pt-1 px-2 md:px-3 font-[Poppins] font-light text-sm md:text-[15px] leading-relaxed text-[#FCFBFA]/85 max-w-2xl">
                        <AnswerText text={item.answer} />
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}

            {/* Quiet Bottom CTA Row */}
            <div className="mt-6 pt-8 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 font-[Poppins]">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <span className="text-sm text-[#FCFBFA]/70 font-light">
                  Didn't find your answer?
                </span>
                <Link
                  to="/inquire"
                  className="inline-flex items-center text-[#C5A059] hover:text-white transition-colors duration-200 underline underline-offset-4 decoration-[#C5A059]/40 hover:decoration-white font-medium text-sm"
                >
                  Start a project →
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
        </div>
      </div>
    </ServicePageLayout>
  );
}
