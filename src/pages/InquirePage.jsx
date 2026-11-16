import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import { ServiceHeader } from '@/components/layout/ServiceHeader'
import { BackToVault } from '@/components/shared/BackToVault'
import { INQUIRE_CONFIG } from '@/constants/inquire'
import VantaFogBackground from '@/components/effects/VantaFogBackground'
import { useSeo } from '@/seo/useSeo'

export default function InquirePage() {
  useSeo('inquire')
  const containerRef = useRef(null)
  const nameInputRef = useRef(null)
  const emailInputRef = useRef(null)
  const briefInputRef = useRef(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    brief: ''
  })
  
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [formWarning, setFormWarning] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | success | error
  const [errorMessage, setErrorMessage] = useState('')

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  // Fade-in animations on mount
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
    tl.fromTo('.animate-fade-up', 
      { opacity: 0, y: 16 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, delay: 0.05 }
    )
    return () => tl.kill()
  }, [])

  const validateField = (name, value) => {
    const trimmed = (value ?? '').trim()
    switch (name) {
      case 'name':
        if (!trimmed) {
          return 'Full name is required'
        }
        if (trimmed.length < 2) {
          return 'Name must be at least 2 characters'
        }
        if (value.length > 30) {
          return 'Name cannot exceed 30 characters'
        }
        return ''

      case 'email':
        if (!trimmed) {
          return 'Email address is required'
        }
        if (trimmed.length > 100) {
          return 'Email address cannot exceed 100 characters'
        }
        if (!trimmed.includes('@')) {
          return "Email address must contain an '@' symbol"
        }
        {
          const parts = trimmed.split('@')
          if (parts.length !== 2 || !parts[0] || !parts[1]) {
            return 'Please enter a complete email address'
          }
          if (!parts[1].includes('.')) {
            return "Email domain must include a '.' extension (e.g. brand.com)"
          }
          const domainParts = parts[1].split('.')
          const tld = domainParts[domainParts.length - 1]
          if (!tld || tld.length < 2) {
            return 'Domain extension must be at least 2 characters (e.g. .com)'
          }
        }
        {
          const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/
          if (!emailRegex.test(trimmed) || trimmed.includes('..')) {
            return 'Please enter a valid email address (e.g. name@brand.com)'
          }
        }
        return ''

      case 'company':
        if (value && value.length > 60) {
          return 'Company name cannot exceed 60 characters'
        }
        return ''

      case 'brief':
        if (!trimmed) {
          return 'Project brief is required'
        }
        if (trimmed.length < 25) {
          const needed = 25 - trimmed.length
          return `Project brief must be at least 25 characters (${needed} more needed)`
        }
        if (value.length > 500) {
          const excess = value.length - 500
          return `Project brief cannot exceed 500 characters (${excess} over limit)`
        }
        return ''

      default:
        return ''
    }
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
    const error = validateField(name, value)
    setErrors((prev) => {
      const next = { ...prev, [name]: error }
      if (!Object.values(next).some(Boolean)) {
        setFormWarning('')
      }
      return next
    })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // If already touched or displaying error, validate dynamically as user types
    if (touched[name] || errors[name]) {
      const error = validateField(name, value)
      setErrors((prevErr) => {
        const nextErr = { ...prevErr, [name]: error }
        if (!Object.values(nextErr).some(Boolean)) {
          setFormWarning('')
        }
        return nextErr
      })
    }
  }

  const validateForm = () => {
    const nameError = validateField('name', formData.name)
    const emailError = validateField('email', formData.email)
    const companyError = validateField('company', formData.company)
    const briefError = validateField('brief', formData.brief)

    const newErrors = {
      name: nameError,
      email: emailError,
      company: companyError,
      brief: briefError,
    }

    setErrors(newErrors)
    setTouched({
      name: true,
      email: true,
      company: true,
      brief: true,
    })

    const hasErrors = Object.values(newErrors).some(Boolean)
    if (hasErrors) {
      setFormWarning('Please fix the highlighted errors before submitting your inquiry.')
      if (nameError) {
        nameInputRef.current?.focus()
      } else if (emailError) {
        emailInputRef.current?.focus()
      } else if (briefError) {
        briefInputRef.current?.focus()
      }
      return false
    }

    setFormWarning('')
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setStatus('submitting')
    const scriptUrl = INQUIRE_CONFIG.googleScriptUrl
    
    if (!scriptUrl) {
      setTimeout(() => {
        const mailtoSubject = encodeURIComponent(`Inquiry from ${formData.name}`);
        const mailtoBody = encodeURIComponent(
          `Cinegem Inquiry:\n\n` +
          `Name: ${formData.name}\n` +
          `Email: ${formData.email}\n` +
          `Company: ${formData.company || 'N/A'}\n\n` +
          `Project Brief:\n${formData.brief}`
        );
        window.location.href = `mailto:${INQUIRE_CONFIG.fallbackEmail}?subject=${mailtoSubject}&body=${mailtoBody}`
        setStatus('success')
      }, 800)
      return
    }

    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()
      if (result.status === 'success') {
        setStatus('success')
      } else {
        throw new Error(result.message || 'Error saving to spreadsheet')
      }
    } catch (err) {
      console.error('Submission error:', err)
      setStatus('error')
      setErrorMessage(
        'Could not connect to the form database. Click below to submit via email instead.'
      )
    }
  }

  const triggerEmailFallback = () => {
    const mailtoSubject = encodeURIComponent(`Inquiry from ${formData.name}`);
    const mailtoBody = encodeURIComponent(
      `Cinegem Inquiry:\n\n` +
      `Name: ${formData.name}\n` +
      `Email: ${formData.email}\n` +
      `Company: ${formData.company || 'N/A'}\n\n` +
      `Project Brief:\n${formData.brief}`
    );
    window.location.href = `mailto:${INQUIRE_CONFIG.fallbackEmail}?subject=${mailtoSubject}&body=${mailtoBody}`
    setStatus('success')
  }

  return (
    <div
      className="min-h-screen lg:h-screen lg:max-h-screen w-full overflow-x-hidden overflow-y-auto lg:overflow-hidden text-[#FCFBFA] antialiased selection:bg-[#C5A059] selection:text-white flex flex-col justify-start lg:justify-between pt-20 sm:pt-24 md:pt-28 pb-8 sm:pb-10 relative"
      style={{ background: '#0c0d16' }}
    >
      {/* Vanta Fog Background */}
      <VantaFogBackground zIndex={0} />
      <div className="grain-overlay" aria-hidden="true" />
      
      {/* ── Top Header Menu (matching all other service pages) ──────── */}
      <ServiceHeader currentPage="/inquire" alwaysVisible={true} theme="dark" />

      {/* ── Main Content Container ─────────────────────────────────── */}
      <div className="w-full max-w-[1440px] mx-auto px-5 sm:px-8 md:px-12 lg:px-16 z-10 flex flex-col flex-1 my-auto justify-center">
        
        {/* Back navigation link */}
        <div className="animate-fade-up mb-3 sm:mb-4 lg:mb-6">
          <BackToVault light className="!mb-0" />
        </div>

        {/* Content grid: Single column unified layout on mobile/tablet, 2 columns on desktop */}
        <div
          ref={containerRef}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-16 items-start lg:items-center"
        >
          {/* ── Left / Top: Editorial Typography (Consistent luxury hierarchy) ── */}
          <div className="flex flex-col gap-2.5 sm:gap-3.5 lg:gap-5">
            <h1
              className="font-[Poppins] font-semibold text-[30px] sm:text-[40px] md:text-[50px] lg:text-[60px] leading-[1.1] tracking-[-0.03em] text-[#FCFBFA] animate-fade-up"
            >
              Let's Create
              <br />
              Something Rare.
            </h1>
            
            <p className="font-[Poppins] font-light text-[13px] sm:text-[14px] md:text-[15px] leading-[1.6] text-[#FCFBFA]/90 max-w-lg animate-fade-up">
              We translate the structural perfection of your finest collections into interactive 3D sliders, photorealistic rendering grids, and cinematic animations. Complete the brief and our studio team will align on your project.
            </p>
            
            <div className="h-px bg-white/20 my-1 max-w-sm animate-fade-up" />
            
            <div className="flex flex-col gap-0.5 animate-fade-up">
              <span className="font-label text-[9px] sm:text-[10px] tracking-[0.2em] uppercase text-[#C5A059] font-semibold">
                DIRECT INQUIRIES
              </span>
              <a
                href={`mailto:${INQUIRE_CONFIG.fallbackEmail}`}
                className="font-[Poppins] font-medium text-[12px] sm:text-[13px] tracking-wider text-[#FCFBFA] hover:text-[#C5A059] transition-colors duration-300 w-fit"
              >
                {INQUIRE_CONFIG.fallbackEmail}
              </a>
            </div>
          </div>

          {/* ── Right / Bottom: Glassmorphic Form Card ─────────────────── */}
          <div className="w-full max-w-xl animate-fade-up justify-self-center lg:justify-self-end">
            <AnimatePresence mode="wait">
              
              {status !== 'success' ? (
                <motion.div
                  key="form-container"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.4, ease: 'easeInOut' }}
                  className="relative overflow-hidden p-5 sm:p-7 md:p-8 border border-white/20 bg-black/40 backdrop-blur-2xl shadow-2xl rounded-lg"
                >
                  <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-3 sm:gap-4">
                    
                    {/* Full Name field */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="inquire-name"
                          className="font-label text-[10px] tracking-[0.18em] uppercase text-[#FCFBFA] font-semibold"
                        >
                          Full Name *
                        </label>
                        <span
                          className={`text-[10px] font-mono tracking-wider transition-colors ${
                            formData.name.length > 30
                              ? 'text-red-400 font-semibold'
                              : formData.name.length > 25
                              ? 'text-[#C5A059]'
                              : 'text-white/40'
                          }`}
                        >
                          {formData.name.length}/30
                        </span>
                      </div>
                      <input
                        ref={nameInputRef}
                        id="inquire-name"
                        type="text"
                        name="name"
                        maxLength={30}
                        value={formData.name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        placeholder="e.g. Jean Laurent"
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? 'name-error' : undefined}
                        className={`font-[Poppins] font-light text-sm px-4 py-2.5 bg-white/5 border text-[#FCFBFA] placeholder:text-white/60 focus:bg-white/10 transition-all duration-300 outline-none rounded-md ${
                          errors.name
                            ? 'border-red-500/80 focus:border-red-400 bg-red-950/20 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                            : 'border-white/20 focus:border-[#C5A059]'
                        }`}
                      />
                      {errors.name && (
                        <div
                          id="name-error"
                          className="flex items-center gap-1.5 text-red-400 text-[11px] font-medium tracking-wide mt-0.5 animate-fadeIn"
                        >
                          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>{errors.name}</span>
                        </div>
                      )}
                    </div>

                    {/* Email & Company fields (2-column grid matching iPad / Desktop) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="flex flex-col gap-1">
                        <label
                          htmlFor="inquire-email"
                          className="font-label text-[10px] tracking-[0.18em] uppercase text-[#FCFBFA] font-semibold"
                        >
                          Email Address *
                        </label>
                        <input
                          ref={emailInputRef}
                          id="inquire-email"
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="jean@brand.com"
                          aria-invalid={Boolean(errors.email)}
                          aria-describedby={errors.email ? 'email-error' : undefined}
                          className={`font-[Poppins] font-light text-sm px-4 py-2.5 bg-white/5 border text-[#FCFBFA] placeholder:text-white/60 focus:bg-white/10 transition-all duration-300 outline-none rounded-md ${
                            errors.email
                              ? 'border-red-500/80 focus:border-red-400 bg-red-950/20 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                              : 'border-white/20 focus:border-[#C5A059]'
                          }`}
                        />
                        {errors.email && (
                          <div
                            id="email-error"
                            className="flex items-center gap-1.5 text-red-400 text-[11px] font-medium tracking-wide mt-0.5 animate-fadeIn"
                          >
                            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            <span>{errors.email}</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="inquire-company"
                            className="font-label text-[10px] tracking-[0.18em] uppercase text-[#FCFBFA] font-semibold"
                          >
                            Company Name
                          </label>
                          <span className="text-[10px] font-mono tracking-wider text-white/40">Optional</span>
                        </div>
                        <input
                          id="inquire-company"
                          type="text"
                          name="company"
                          maxLength={60}
                          value={formData.company}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          placeholder="e.g. Maison Laurent"
                          className="font-[Poppins] font-light text-sm px-4 py-2.5 bg-white/5 border border-white/20 text-[#FCFBFA] placeholder:text-white/60 focus:bg-white/10 focus:border-[#C5A059] transition-all duration-300 outline-none rounded-md"
                        />
                      </div>
                    </div>

                    {/* Project brief */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="inquire-brief"
                          className="font-label text-[10px] tracking-[0.18em] uppercase text-[#FCFBFA] font-semibold"
                        >
                          Project Brief *
                        </label>
                        <span
                          className={`text-[10px] font-mono tracking-wider transition-colors ${
                            formData.brief.length === 0
                              ? 'text-white/40'
                              : formData.brief.length < 25
                              ? 'text-amber-400 font-medium'
                              : formData.brief.length > 500
                              ? 'text-red-400 font-semibold'
                              : 'text-emerald-400/90'
                          }`}
                        >
                          {formData.brief.length}/500 {formData.brief.length < 25 ? `(min 25)` : ''}
                        </span>
                      </div>
                      <textarea
                        ref={briefInputRef}
                        id="inquire-brief"
                        name="brief"
                        maxLength={500}
                        value={formData.brief}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        rows={3}
                        placeholder="Outline the details of the products, creative vision, assets required, and scope (min 25 characters)..."
                        aria-invalid={Boolean(errors.brief)}
                        aria-describedby={errors.brief ? 'brief-error' : undefined}
                        className={`font-[Poppins] font-light text-sm px-4 py-2.5 bg-white/5 border text-[#FCFBFA] placeholder:text-white/60 focus:bg-white/10 transition-all duration-300 outline-none rounded-md resize-none ${
                          errors.brief
                            ? 'border-red-500/80 focus:border-red-400 bg-red-950/20 shadow-[0_0_12px_rgba(239,68,68,0.2)]'
                            : 'border-white/20 focus:border-[#C5A059]'
                        }`}
                      />
                      {errors.brief && (
                        <div
                          id="brief-error"
                          className="flex items-center gap-1.5 text-red-400 text-[11px] font-medium tracking-wide mt-0.5 animate-fadeIn"
                        >
                          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                          <span>{errors.brief}</span>
                        </div>
                      )}
                    </div>

                    {/* Pre-submit Form Warning Banner */}
                    <AnimatePresence>
                      {formWarning && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -6, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="p-3.5 bg-red-950/70 border border-red-500/60 rounded-md flex items-start gap-2.5 text-red-200 text-xs shadow-lg"
                          role="alert"
                        >
                          <svg
                            className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          <div className="flex flex-col gap-0.5 flex-1">
                            <span className="font-semibold text-red-200 tracking-wide text-[11px] uppercase">
                              Unable to Submit
                            </span>
                            <span className="text-red-300/90 text-[11px] leading-relaxed">
                              {formWarning}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Backend / Network Error Notification */}
                    {status === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-red-950/60 border border-red-500/40 flex flex-col gap-2 rounded-md"
                      >
                        <p className="text-red-200 text-xs font-light">{errorMessage}</p>
                        <button
                          type="button"
                          onClick={triggerEmailFallback}
                          className="btn-primary py-2 px-4 text-[10px] font-semibold tracking-wider self-start rounded-md"
                        >
                          SEND EMAIL NOW
                        </button>
                      </motion.div>
                    )}

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={status === 'submitting'}
                      className={`btn-primary flex justify-center items-center gap-3 w-full py-3.5 mt-1 rounded-md text-xs font-semibold tracking-widest uppercase transition-all ${
                        status === 'submitting' ? 'opacity-80 cursor-wait' : 'cursor-pointer hover:scale-[1.01]'
                      }`}
                    >
                      {status === 'submitting' ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          <span>SUBMITTING BRIEF...</span>
                        </>
                      ) : (
                        <span>SUBMIT INQUIRY →</span>
                      )}
                    </button>

                  </form>
                </motion.div>
              ) : (
                /* ── Success Screen ────────────────────────────────────────── */
                <motion.div
                  key="success-container"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="p-8 border border-white/20 bg-black/50 backdrop-blur-2xl flex flex-col items-center justify-center text-center shadow-2xl rounded-lg"
                >
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 72 72"
                    fill="none"
                    className="mb-6"
                  >
                    <motion.circle
                      cx="36"
                      cy="36"
                      r="34"
                      stroke="#C5A059"
                      strokeWidth="2.5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                    <motion.path
                      d="M22 36l9 9 19-19"
                      stroke="#C5A059"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.5, delay: 0.6, ease: 'easeOut' }}
                    />
                  </svg>

                  <h2 className="font-[Poppins] font-semibold text-2xl md:text-3xl text-[#FCFBFA] tracking-wide mb-3">
                    Inquiry Received.
                  </h2>
                  
                  <p className="font-[Poppins] font-light text-sm text-[#FCFBFA]/80 leading-relaxed max-w-sm mb-8">
                    Our studio team will review your project brief and get back to you within 24-48 hours.
                  </p>

                  <Link
                    to="/"
                    className="btn-ghost text-[10px] tracking-[0.2em] font-semibold py-3 px-8 text-[#FCFBFA] border border-white/20 hover:bg-[#FCFBFA] hover:text-[#121212] transition-colors duration-500 rounded-md"
                  >
                    ← BACK TO HOME
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>
    </div>
  )
}
