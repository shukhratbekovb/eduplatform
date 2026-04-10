import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
        },
        sidebar: {
          bg:           '#1E1B4B',
          hover:        '#2D2A6E',
          active:       '#312E81',
          text:         '#C7D2FE',
          'text-active':'#FFFFFF',
          icon:         '#818CF8',
        },
        success: {
          50:  '#ECFDF5',
          500: '#10B981',
          700: '#047857',
        },
        warning: {
          50:  '#FFFBEB',
          500: '#F59E0B',
          700: '#B45309',
        },
        danger: {
          50:  '#FEF2F2',
          500: '#EF4444',
          700: '#B91C1C',
        },
        info: {
          50:  '#EFF6FF',
          500: '#3B82F6',
          700: '#1D4ED8',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        xs:   ['12px', { lineHeight: '16px' }],
        sm:   ['14px', { lineHeight: '20px' }],
        base: ['16px', { lineHeight: '24px' }],
        lg:   ['18px', { lineHeight: '28px' }],
        xl:   ['20px', { lineHeight: '28px' }],
        '2xl':['24px', { lineHeight: '32px' }],
        '3xl':['30px', { lineHeight: '36px' }],
      },
      boxShadow: {
        xs:     '0 1px 2px rgba(0,0,0,0.05)',
        sm:     '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)',
        md:     '0 4px 6px -1px rgba(0,0,0,0.10), 0 2px 4px -1px rgba(0,0,0,0.06)',
        lg:     '0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -2px rgba(0,0,0,0.05)',
        drawer: '-4px 0 24px rgba(0,0,0,0.12)',
        drag:   '0 8px 32px rgba(0,0,0,0.18)',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '6px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
      width: {
        sidebar: '240px',
        'sidebar-sm': '64px',
        drawer: '560px',
      },
      height: {
        topbar: '64px',
      },
      keyframes: {
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        'slide-out-right': {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(100%)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to:   { transform: 'scale(1)', opacity: '1' },
        },
        'accordion-down': {
          from: { height: '0' },
          to:   { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to:   { height: '0' },
        },
      },
      animation: {
        'slide-in-right': 'slide-in-right 0.25s cubic-bezier(0.4,0,0.2,1)',
        'slide-out-right': 'slide-out-right 0.25s cubic-bezier(0.4,0,0.2,1)',
        'fade-in':   'fade-in 0.15s ease-out',
        'scale-in':  'scale-in 0.15s cubic-bezier(0.4,0,0.2,1)',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
