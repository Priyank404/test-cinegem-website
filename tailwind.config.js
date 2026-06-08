/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Surfaces
        surface:                       '#fbf9f1',
        'surface-dim':                 '#dcdad2',
        'surface-bright':              '#fbf9f1',
        'surface-container-lowest':    '#ffffff',
        'surface-container-low':       '#f5f4ec',
        'surface-container':           '#f0eee6',
        'surface-container-high':      '#eae8e0',
        'surface-container-highest':   '#e4e3db',
        'surface-variant':             '#e4e3db',
        'on-surface':                  '#1b1c17',
        'on-surface-variant':          '#444748',
        'inverse-surface':             '#30312c',
        'inverse-on-surface':          '#f3f1e9',
        // Outlines
        outline:                       '#747878',
        'outline-variant':             '#c4c7c7',
        // Primary
        primary:                       '#000000',
        'on-primary':                  '#ffffff',
        'primary-container':           '#1c1b1b',
        'on-primary-container':        '#858383',
        'inverse-primary':             '#c8c6c5',
        'surface-tint':                '#5f5e5e',
        // Secondary / Gold
        secondary:                     '#735c00',
        'on-secondary':                '#ffffff',
        'secondary-container':         '#fed65b',
        'on-secondary-container':      '#745c00',
        // Brand tokens
        'charcoal-deep':               '#121212',
        'champagne-gold':              '#C5A059',
        'sand-neutral':                '#E5DACE',
        'cream-soft':                  '#FAF9F6',
        'glass-surface':               'rgba(255,255,255,0.4)',
        // Background
        background:                    '#fbf9f1',
        'on-background':               '#1b1c17',
      },
      fontFamily: {
        display:  ['"Playfair Display"', 'Georgia', 'serif'],
        headline: ['"Playfair Display"', 'Georgia', 'serif'],
        body:     ['Manrope', 'system-ui', 'sans-serif'],
        label:    ['Manrope', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-lg':  ['clamp(3rem,5.5vw,4.5rem)',   { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '400' }],
        'headline-lg': ['clamp(2rem,3.5vw,3rem)',      { lineHeight: '1.17', fontWeight: '400' }],
        'headline-md': ['clamp(1.5rem,2.5vw,2rem)',    { lineHeight: '1.25', fontWeight: '400' }],
        'body-lg':     ['1.125rem',                    { lineHeight: '1.56', fontWeight: '400' }],
        'body-md':     ['1rem',                        { lineHeight: '1.5',  fontWeight: '400' }],
        'label-caps':  ['0.75rem',                     { lineHeight: '1.33', letterSpacing: '0.15em', fontWeight: '600' }],
      },
      spacing: {
        unit:           '8px',
        gutter:         '32px',
        'margin-desktop': '80px',
        'margin-mobile':  '24px',
        'container-max':  '1440px',
      },
      maxWidth: {
        container: '1440px',
      },
      borderRadius: {
        DEFAULT: '0px',
        sm:      '0px',
        md:      '0px',
        lg:      '4px',
        xl:      '8px',
        '2xl':   '12px',
        full:    '9999px',
      },
      backdropBlur: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '20px',
        xl: '40px',
      },
      boxShadow: {
        'float-sm':   '0 8px 32px -8px rgba(18,18,18,0.08)',
        float:        '0 20px 60px -12px rgba(18,18,18,0.15)',
        'float-lg':   '0 40px 80px -20px rgba(18,18,18,0.25)',
        'float-gold': '0 20px 60px -12px rgba(197,160,89,0.3)',
        glass:        'inset 0 0 0 0.5px rgba(255,255,255,0.6), 0 8px 32px rgba(18,18,18,0.08)',
      },
      keyframes: {
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'float-subtle': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        grain: {
          '0%, 100%': { transform: 'translate(0,0)' },
          '10%':      { transform: 'translate(-2%,-3%)' },
          '30%':      { transform: 'translate(3%,-1%)' },
          '50%':      { transform: 'translate(-1%,2%)' },
          '70%':      { transform: 'translate(-3%,1%)' },
          '90%':      { transform: 'translate(2%,3%)' },
        },
        'pulse-gold': {
          '0%, 100%': { opacity: '0.6' },
          '50%':      { opacity: '1' },
        },
      },
      animation: {
        'fade-up':      'fade-up 0.8s cubic-bezier(0.16,1,0.3,1) forwards',
        'fade-in':      'fade-in 1s ease forwards',
        'float-subtle': 'float-subtle 6s ease-in-out infinite',
        shimmer:        'shimmer 3s linear infinite',
        grain:          'grain 0.8s steps(1) infinite',
        'pulse-gold':   'pulse-gold 2.5s ease-in-out infinite',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.16,1,0.3,1)',
        expo:   'cubic-bezier(0.19,1,0.22,1)',
      },
    },
  },
  plugins: [],
}
