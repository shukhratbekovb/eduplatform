import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
        },
        success: {
          50:  '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        danger: {
          50:  '#fef2f2',
          200: '#fecaca',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
        warning: {
          50:  '#fffbeb',
          100: '#fef3c7',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        info: {
          50:  '#ecfeff',
          400: '#22d3ee',
          500: '#06b6d4',
          600: '#0891b2',
        },
        sidebar: {
          bg:            '#78350F',
          hover:         '#92400E',
          active:        '#B45309',
          text:          '#FDE68A',
          'text-active': '#FFFFFF',
          icon:          '#FCD34D',
          border:        'rgba(255,255,255,0.1)',
        },
      },
      width: {
        sidebar:      '220px',
        'sidebar-sm': '60px',
      },
      keyframes: {
        'fade-in':         { from: { opacity: '0' },                          to: { opacity: '1' } },
        'slide-in-right':  { from: { transform: 'translateX(100%)' },         to: { transform: 'translateX(0)' } },
        'scale-in':        { from: { transform: 'scale(0.95)', opacity: '0' },to: { transform: 'scale(1)', opacity: '1' } },
      },
      animation: {
        'fade-in':        'fade-in 0.2s ease-out',
        'slide-in-right': 'slide-in-right 0.25s ease-out',
        'scale-in':       'scale-in 0.15s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
