import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { gsap } from 'gsap'
import { BackToVault } from '@/components/shared/BackToVault'
import { INQUIRE_CONFIG } from '@/constants/inquire'
import { Footer } from '@/components/layout/Footer'
import VantaFogBackground from '@/components/effects/VantaFogBackground'

export default function InquirePage() {
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
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.1, delay: 0.15 }
    )
    return () => tl.kill()
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error for this field
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
      newErrors.email = 'Invalid email address'
    }
    if (!formData.brief.trim()) newErrors.brief = 'Project brief details are required'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setStatus('submitting')
    
    // Check if Google Apps Script URL is configured
    const scriptUrl = INQUIRE_CONFIG.googleScriptUrl
    
    if (!scriptUrl) {
      // Fallback: mailto pre-filled email
      setTimeout(() => {
        const mailtoSubject = encodeURIComponent(`Inquiry from ${formData.name}`);
        const mailtoBody = encodeURIComponent(
          `Cinegem Inquiry Details:\n\n` +
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
          'Content-Type': 'text/plain;charset=utf-8', // Bypass CORS preflight issues on standard scripts
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
      // Provide user fallback option directly in the error message
      setStatus('error')
      setErrorMessage(
        'Could not connect to the form database. Click below to submit via email instead.'
      )
    }
  }

  const triggerEmailFallback = () => {
    const mailtoSubject = encodeURIComponent(`Inquiry from ${formData.name}`);
    const mailtoBody = encodeURIComponent(
      `Cinegem Inquiry Details:\n\n` +
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
      className="min-h-screen text-[#1b1c17] antialiased selection:bg-[#C5A059] selection:text-white flex flex-col"
      style={{ background: '#FAF9F6' }}
    >
      {/* Vanta Fog Background */}
      <VantaFogBackground zIndex={0} />
      <div className="grain-overlay" aria-hidden="true" />
      
      <div
        ref={containerRef}
        className="flex-1 w-full max-w-[1440px] mx-auto pt-24 pb-20 px-6 md:px-20 flex flex-col"
      >
        {/* ── Header Back Button ────────────────────────────────────────── */}
        <div className="w-full mb-8 animate-fade-up">
          <BackToVault />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start flex-1">
          
          {/* ── Left Side: Editorial Typography ───────────────────────────── */}
          <div className="flex flex-col gap-6 lg:pt-8">
            <span className="text-[#C5A059] font-label text-[10px] tracking-[0.35em] uppercase font-semibold block animate-fade-up">
              CINEGEM STUDIO
            </span>
            <h1
              className="font-[Playfair_Display] text-[44px] md:text-[72px] leading-[48px] md:leading-[78px] tracking-[-0.03em] text-[#121212] font-normal animate-fade-up"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Let's Craft
              <br />
              Something Rare.
            </h1>
            <p className="font-[Manrope] text-[15px] md:text-[17px] leading-[26px] md:leading-[28px] text-[#555] max-w-md animate-fade-up font-light">
              We translate the structural perfection of your finest collections into high-fidelity WebGL sliders, photorealistic rendering grids, and cinematic animations. Complete the brief and our studio team will align on your project.
            </p>
            
            <div className="h-px bg-[#c4c7c7]/30 my-6 max-w-sm animate-fade-up" />
            
            <div className="flex flex-col gap-2 animate-fade-up">
              <span className="font-label text-[9px] tracking-[0.2em] uppercase text-on-surface-variant font-semibold">
                DIRECT INQUIRIES
              </span>
              <a
                href={`mailto:${INQUIRE_CONFIG.fallbackEmail}`}
                className="font-[Manrope] text-[13px] tracking-wider text-[#121212] hover:text-[#C5A059] transition-colors duration-300 w-fit"
              >
                {INQUIRE_CONFIG.fallbackEmail}
              </a>
            </div>
          </div>

          {/* ── Right Side: Premium Glassmorphic Form / Success Card ──────── */}
          <div className="w-full max-w-xl animate-fade-up">
            <AnimatePresence mode="wait">
              
              {status !== 'success' ? (
                <motion.div
                  key="form-container"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                  className="relative overflow-hidden p-8 border border-white/40 bg-white/40 backdrop-blur-xl shadow-float rounded-[2px]"
                  style={{
                    boxShadow: 'inset 0 0 0 0.5px rgba(255, 255, 255, 0.6), 0 20px 60px -12px rgba(18, 18, 18, 0.08)'
                  }}
                >
                  <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                    
                    {/* Name field */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label text-[10px] tracking-[0.18em] uppercase text-[#121212] font-semibold">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g. Jean Laurent"
                        className={`font-[Manrope] text-sm px-4 py-3 border bg-[#FAF9F6]/50 focus:bg-[#FAF9F6] focus:border-[#C5A059] transition-all duration-300 outline-none rounded-[2px] ${
                          errors.name ? 'border-red-500/60' : 'border-[#c4c7c7]'
                        }`}
                      />
                      {errors.name && (
                        <span className="text-red-600 text-[10px] font-semibold tracking-wider font-body">{errors.name}</span>
                      )}
                    </div>

                    {/* Email & Company fields (row) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex flex-col gap-1.5">
                        <label className="font-label text-[10px] tracking-[0.18em] uppercase text-[#121212] font-semibold">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="jean@brand.com"
                          className={`font-[Manrope] text-sm px-4 py-3 border bg-[#FAF9F6]/50 focus:bg-[#FAF9F6] focus:border-[#C5A059] transition-all duration-300 outline-none rounded-[2px] ${
                            errors.email ? 'border-red-500/60' : 'border-[#c4c7c7]'
                          }`}
                        />
                        {errors.email && (
                          <span className="text-red-600 text-[10px] font-semibold tracking-wider font-body">{errors.email}</span>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1.5">
                        <label className="font-label text-[10px] tracking-[0.18em] uppercase text-[#121212] font-semibold">
                          Company Name
                        </label>
                        <input
                          type="text"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          placeholder="e.g. Maison Laurent"
                          className="font-[Manrope] text-sm px-4 py-3 border border-[#c4c7c7] bg-[#FAF9F6]/50 focus:bg-[#FAF9F6] focus:border-[#C5A059] transition-all duration-300 outline-none rounded-[2px]"
                        />
                      </div>
                    </div>


                    {/* Project brief */}
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label text-[10px] tracking-[0.18em] uppercase text-[#121212] font-semibold">
                        Project Brief *
                      </label>
                      <textarea
                        name="brief"
                        value={formData.brief}
                        onChange={handleChange}
                        rows={5}
                        placeholder="Outline the details of the products, creative vision, assets required, and scope..."
                        className={`font-[Manrope] text-sm px-4 py-3 border bg-[#FAF9F6]/50 focus:bg-[#FAF9F6] focus:border-[#C5A059] transition-all duration-300 outline-none rounded-[2px] resize-none ${
                          errors.brief ? 'border-red-500/60' : 'border-[#c4c7c7]'
                        }`}
                      />
                      {errors.brief && (
                        <span className="text-red-600 text-[10px] font-semibold tracking-wider font-body">{errors.brief}</span>
                      )}
                    </div>

                    {/* Error Notification */}
                    {status === 'error' && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 bg-red-50 border border-red-200/50 flex flex-col gap-3 rounded-[2px]"
                      >
                        <p className="text-red-800 font-body text-xs font-medium">{errorMessage}</p>
                        <button
                          type="button"
                          onClick={triggerEmailFallback}
                          className="btn-primary py-2.5 px-5 text-[10px] font-semibold tracking-wider self-start rounded-[2px]"
                        >
                          SEND EMAIL NOW
                        </button>
                      </motion.div>
                    )}

                    {/* Submit button */}
                    <button
                      type="submit"
                      disabled={status === 'submitting'}
                      className={`btn-primary flex justify-center items-center gap-3 w-full py-4 mt-2 rounded-[2px] relative ${
                        status === 'submitting' ? 'opacity-80 cursor-wait' : 'cursor-pointer'
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
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  className="p-10 border border-white/40 bg-[#FAF9F6]/80 backdrop-blur-xl flex flex-col items-center justify-center text-center shadow-float rounded-[2px]"
                  style={{
                    boxShadow: 'inset 0 0 0 0.5px rgba(255, 255, 255, 0.6), 0 20px 60px -12px rgba(18, 18, 18, 0.08)'
                  }}
                >
                  {/* SVG Animated checkmark */}
                  <svg
                    width="72"
                    height="72"
                    viewBox="0 0 72 72"
                    fill="none"
                    className="mb-8"
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

                  <h2 className="font-[Playfair_Display] text-3xl text-[#121212] tracking-wide mb-4 font-normal">
                    Inquiry Received.
                  </h2>
                  
                  <p className="font-[Manrope] text-sm text-[#555] leading-relaxed max-w-sm mb-10 font-light">
                    Our studio team will review your project brief and get back to you within 24-48 hours.
                  </p>

                  <Link
                    to="/"
                    className="btn-ghost text-[10px] tracking-[0.2em] font-semibold py-3 px-8 hover:bg-[#121212] hover:text-[#FAF9F6] transition-colors duration-500 rounded-[2px]"
                  >
                    ← BACK TO THE VAULT
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </div>
      </div>

      <Footer />
    </div>
  )
}
