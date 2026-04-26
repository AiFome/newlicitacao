import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'monospace'],
        display: ['var(--font-display)', 'Georgia', 'serif'],
      },
      fontWeight: {
        '300': '300',
        '400': '400',
        '500': '500',
        '600': '600',
        '700': '700',
        '800': '800',
      },
      colors: {
        brand: {
          50:  '#f0faf4',
          100: '#d6f0e2',
          200: '#a8dfc3',
          300: '#6cc69c',
          400: '#38a876',
          500: '#228a5b',
          600: '#166b45',
          700: '#115436',
          800: '#0d4029',
          900: '#082b1b',
        },
        surface: {
          base:    '#faf9f6',
          alt:     '#f3f1ec',
          primary: '#ffffff',
          muted:   '#f3f1ec',
          border:  '#e8e5dd',
          'border-strong': '#ccc9be',
        },
        text: {
          DEFAULT: '#18180f',
          strong:  '#0f0f08',
          muted:   '#7a7769',
          light:   '#b0ad9f',
        },
      },
      boxShadow: {
        'sm':    '0 1px 2px rgba(0,0,0,0.05)',
        'card':  '0 1px 2px rgba(0,0,0,0.05)',
        'md':    '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        'hover': '0 4px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)',
        'lg':    '0 12px 40px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
        'xl':    '0 24px 64px rgba(0,0,0,0.16)',
        'modal': '0 24px 64px rgba(0,0,0,0.16), 0 8px 20px rgba(0,0,0,0.08)',
        'brand': '0 4px 20px rgba(22,107,69,0.25)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'fade-up':     'fadeUp 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in':     'fadeIn 0.4s ease both',
        'scale-in':    'scaleIn 0.35s cubic-bezier(0.22,1,0.36,1) both',
        'slide-right': 'slideRight 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'float':       'float 3s ease-in-out infinite',
        'shimmer':     'shimmer 1.5s infinite',
        'pulse-ring':  'pulse-ring 2s ease-out infinite',
        'spin-slow':   'spin 3s linear infinite',
      },
      keyframes: {
        fadeUp:      { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'none' } },
        fadeIn:      { from: { opacity: '0' }, to: { opacity: '1' } },
        scaleIn:     { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        slideRight:  { from: { opacity: '0', transform: 'translateX(-12px)' }, to: { opacity: '1', transform: 'none' } },
        float:       { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-6px)' } },
        shimmer:     { from: { backgroundPosition: '-200% 0' }, to: { backgroundPosition: '200% 0' } },
        'pulse-ring': { '0%': { boxShadow: '0 0 0 0 rgba(56,168,118,0.4)' }, '70%': { boxShadow: '0 0 0 10px rgba(56,168,118,0)' }, '100%': { boxShadow: '0 0 0 0 rgba(56,168,118,0)' } },
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
}

export default config
