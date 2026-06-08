import { useState, useCallback, useId } from 'react'
import { motion }                         from 'framer-motion'
import { SectionLabel, GoldDivider, PrimaryButton } from '@/components/ui'
import { cn }                             from '@/lib/utils'

// ─── Field ────────────────────────────────────────────────────────────────────

function Field({ label, type = 'text', name, required = false, multiline = false }) {
  const [focused, setFocused] = useState(false)
  const id = useId()
  const fieldId = `${id}-${name}`

  const baseCls = cn(
    'w-full bg-transparent border-b font-body text-body-md text-charcoal-deep',
    'py-3 outline-none transition-colors duration-300 resize-none',
    focused ? 'border-charcoal-deep' : 'border-outline-variant/50'
  )

  const handleFocus = useCallback(() => setFocused(true),  [])
  const handleBlur  = useCallback(() => setFocused(false), [])

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor={fieldId}
        className="font-label text-label-caps text-on-surface-variant/70"
      >
        {label}
        {required && (
          <span aria-hidden="true" className="text-champagne-gold ml-1">
            *
          </span>
        )}
      </label>

      {multiline ? (
        <textarea
          id={fieldId}
          name={name}
          rows={4}
          required={required}
          aria-required={required}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={baseCls}
        />
      ) : (
        <input
          id={fieldId}
          name={name}
          type={type}
          required={required}
          aria-required={required}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={baseCls}
        />
      )}
    </div>
  )
}

// ─── ContactSection ───────────────────────────────────────────────────────────

export function ContactSection() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = useCallback((e) => {
    e.preventDefault()
    setSubmitted(true)
  }, [])

  return (
    <section
      id="contact"
      className="bg-surface-container-low py-24 md:py-36 border-t border-outline-variant/20"
      aria-labelledby="contact-heading"
    >
      <div className="max-w-container mx-auto px-6 md:px-[--spacing-margin-desktop] grid md:grid-cols-2 gap-16 md:gap-24">

        {/* Left — info */}
        <div className="flex flex-col gap-7">
          <div className="flex flex-col gap-5">
            <SectionLabel>Let's Begin</SectionLabel>
            <GoldDivider />
            <h2
              id="contact-heading"
              className="font-display text-headline-lg text-charcoal-deep tracking-[-0.02em]"
            >
              Tell us about your vision.
            </h2>
          </div>
          <p className="font-body text-body-lg text-on-surface-variant leading-relaxed max-w-sm">
            We work with a select number of maisons and independent designers each season. Every inquiry is answered personally within 24 hours.
          </p>

          {/* Contact detail */}
          <div className="flex flex-col gap-4 mt-4">
            {[
              { label: 'Email',    value: 'atelier@cinegem.studio' },
              { label: 'Response', value: 'Within 24 hours'        },
              { label: 'Based in', value: 'Surat, India — Remote'  },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-1">
                <span className="font-label text-label-caps text-on-surface-variant/50">
                  {label}
                </span>
                <span className="font-body text-body-md text-charcoal-deep">
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — form */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {submitted ? (
            <div
              className="flex flex-col gap-4 h-full justify-center"
              role="status"
              aria-live="polite"
            >
              <div className="h-px w-16 bg-champagne-gold" />
              <p className="font-display text-headline-md text-charcoal-deep tracking-[-0.02em]">
                Thank you.
              </p>
              <p className="font-body text-body-md text-on-surface-variant leading-relaxed">
                Your inquiry has been received. We'll be in touch within 24 hours.
              </p>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-8"
              noValidate
              aria-label="Inquiry form"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <Field label="First Name" name="firstName" required />
                <Field label="Last Name"  name="lastName"  required />
              </div>
              <Field label="Email Address" name="email" type="email" required />
              <Field label="Maison / Studio" name="company" />
              <Field label="Your Vision" name="message" required multiline />

              <PrimaryButton type="submit" className="self-start mt-2">
                Send Inquiry
              </PrimaryButton>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  )
}
