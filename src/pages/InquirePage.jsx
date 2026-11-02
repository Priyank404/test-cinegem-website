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
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    brief: ''
  })
  
  const [errors, setErrors] = useState({})
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

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email'
    }
    if (!formData.brief.trim()) newErrors.brief = 'Brief is required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
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
                  <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-4">
                    
                    {/* Full Name field */}
                    <div className="flex flex-col gap-1">
                      <label className="font-label text-[10px] tracking-[0.18em] uppercase text-[#FCFBFA] font-semibold">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Jean Laurent"
                        className={`font-[Poppins] font-light text-sm px-4 py-2.5 bg-white/5 border text-[#FCFBFA] placeholder:text-white/60 focus:bg-white/10 focus:border-[#C5A059] transition-all duration-300 outline-none rounded-md ${
                          errors.name ? 'border-red-500/80' : 'border-white/20'
                        }`}
                      />
                      {errors.name && (
                        <span className="text-red-400 text-[10px] font-medium tracking-wider">{errors.name}</span>
                      )}
                    </div>

                    {/* Email & Company fields (2-column grid matching iPad / Desktop) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div className="flex flex-col gap-1">
                        <label className="font-label text-[10px] tracking-[0.18em] uppercase text-[#FCFBFA] font-semibold">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="jean@brand.com"
                          className={`font-[Poppins] font-light text-sm px-4 py-2.5 bg-white/5 border text-[#FCFBFA] placeholder:text-white/60 focus:bg-white/10 focus:border-[#C5A059] transition-all duration-300 outline-none rounded-md ${
                            errors.email ? 'border-red-500/80' : 'border-white/20'
                          }`}
                        />
                        {errors.email && (
                          <span className="text-red-400 text-[10px] font-medium tracking-wider">{errors.email}</span>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1">
                        <label className="font-label text-[10px] tracking-[0.18em] uppercase text-[#FCFBFA] font-semibold">
                          Company Name
                        </label>
                        <input
                          type="text"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          placeholder="e.g. Maison Laurent"
                          className="font-[Poppins] font-light text-sm px-4 py-2.5 bg-white/5 border border-white/20 text-[#FCFBFA] placeholder:text-white/60 focus:bg-white/10 focus:border-[#C5A059] transition-all duration-300 outline-none rounded-md"
                        />
                      </div>
                    </div>

                    {/* Project brief */}
                    <div className="flex flex-col gap-1">
                      <label className="font-label text-[10px] tracking-[0.18em] uppercase text-[#FCFBFA] font-semibold">
                        Project Brief *
                      </label>
                      <textarea
                        name="brief"
                        value={formData.brief}
                        onChange={handleChange}
                        rows={3}
                        placeholder="Outline the details of the products, creative vision, assets required, and scope..."
                        className={`font-[Poppins] font-light text-sm px-4 py-2.5 bg-white/5 border text-[#FCFBFA] placeholder:text-white/60 focus:bg-white/10 focus:border-[#C5A059] transition-all duration-300 outline-none rounded-md resize-none ${
                          errors.brief ? 'border-red-500/80' : 'border-white/20'
                        }`}
                      />
                      {errors.brief && (
                        <span className="text-red-400 text-[10px] font-medium tracking-wider">{errors.brief}</span>
                      )}
                    </div>

                    {/* Error Notification */}
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
