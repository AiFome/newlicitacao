import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-geist-sans)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-geist-mono)', 'monospace'],
        display: ['var(--font-syne)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#edf7f1',
          100: '#c8e9d5',
          200: '#94d4b0',
          300: '#5cba87',
          400: '#2d9e65',
          500: '#1a7a4a',
          600: '#1a4731',   // principal
          700: '#133625',
          800: '#0d2419',
          900: '#06120c',
        },
        surface: {
          base:    '#f5f4f0',
          primary: '#ffffff',
          muted:   '#f0efe9',
          border:  '#e3e1d8',
        },
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        hover: '0 4px 16px rgba(0,0,0,0.08)',
        modal: '0 20px 60px rgba(0,0,0,0.15)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'fade-up':    'fadeUp 0.4s ease both',
        'fade-in':    'fadeIn 0.3s ease both',
        'slide-in':   'slideIn 0.3s ease both',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp:     { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
        fadeIn:     { from: { opacity: '0' }, to: { opacity: '1' } },
        slideIn:    { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'none' } },
        pulseSoft:  { '0%,100%': { opacity: '1' }, '50%': { opacity: '.6' } },
      },
    },
  },
  plugins: [],
}

export default config
