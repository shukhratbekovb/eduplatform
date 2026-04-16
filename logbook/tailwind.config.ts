import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── Shared with CRM ────────────────────────────────────────────
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
        // ── LMS-specific: Lesson statuses ──────────────────────────────
        lesson: {
          scheduled:   '#6366F1',
          'in-progress': '#F59E0B',
          conducted:   '#10B981',
          incomplete:  '#EF4444',
          cancelled:   '#9CA3AF',
        },
        // ── LMS-specific: Risk levels ──────────────────────────────────
        risk: {
          normal:   '#10B981',
          'at-risk': '#F59E0B',
          critical: '#EF4444',
        },
        // ── LMS-specific: Gamification ─────────────────────────────────
        diamond: '#6366F1',
        coin:    '#F59E0B',
        badge: {
          bronze:   '#B45309',
          silver:   '#6B7280',
          gold:     '#D97706',
          platinum: '#7C3AED',
        },
        // ── Direction palette (10 colors) ──────────────────────────────
        direction: {
          1:  '#6366F1',
          2:  '#3B82F6',
          3:  '#10B981',
          4:  '#F59E0B',
          5:  '#EF4444',
          6:  '#EC4899',
          7:  '#F97316',
          8:  '#14B8A6',
          9:  '#8B5CF6',
          10: '#06B6D4',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        xs:    ['12px', { lineHeight: '16px' }],
        sm:    ['14px', { lineHeight: '20px' }],
        base:  ['16px', { lineHeight: '24px' }],
        lg:    ['18px', { lineHeight: '28px' }],
        xl:    ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
      },
      boxShadow: {
        xs:     '0 1px 2px rgba(0,0,0,0.05)',
        sm:     '0 1px 3px rgba(0,0,0,0.10), 0 1px 2px rgba(0,0,0,0.06)',
        md:     '0 4px 6px -1px rgba(0,0,0,0.10), 0 2px 4px -1px rgba(0,0,0,0.06)',
        lg:     '0 10px 15px -3px rgba(0,0,0,0.10), 0 4px 6px -2px rgba(0,0,0,0.05)',
        drawer: '-4px 0 24px rgba(0,0,0,0.12)',
        drag:   '0 8px 32px rgba(0,0,0,0.18)',
        lesson: '0 2px 8px rgba(99,102,241,0.12)',
        'lesson-drag': '0 8px 32px rgba(0,0,0,0.18)',
      },
      borderRadius: {
        sm:    '4px',
        DEFAULT: '6px',
        md:    '8px',
        lg:    '12px',
        xl:    '16px',
        '2xl': '24px',
      },
      width: {
        sidebar:    '240px',
        'sidebar-sm': '64px',
        drawer:     '560px',
      },
      height: {
        topbar: '64px',
      },
      keyframes: {
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to:   { transform: 'translateX(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'scale-in': {
          from: { transform: 'scale(0.95)', opacity: '0' },
          to:   { transform: 'scale(1)', opacity: '1' },
        },
        'diamond-pop': {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(1.4)' },
          '100%': { transform: 'scale(1)' },
        },
        'risk-critical-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.5', transform: 'scale(1.3)' },
        },
        'lesson-inprogress': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(245,158,11,0.4)' },
          '50%':      { boxShadow: '0 0 0 6px rgba(245,158,11,0)' },
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
        'slide-in-right':       'slide-in-right 0.25s cubic-bezier(0.4,0,0.2,1)',
        'fade-in':              'fade-in 0.15s ease-out',
        'scale-in':             'scale-in 0.15s cubic-bezier(0.4,0,0.2,1)',
        'diamond-pop':          'diamond-pop 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        'risk-critical-pulse':  'risk-critical-pulse 2s ease-in-out infinite',
        'lesson-inprogress':    'lesson-inprogress 2s ease-in-out infinite',
        'accordion-down':       'accordion-down 0.2s ease-out',
        'accordion-up':         'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
