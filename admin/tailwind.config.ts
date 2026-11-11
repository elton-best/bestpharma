import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'
const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pharma: {
          50: '#F0FDF9', 100: '#CCFBF1', 200: '#99F6E4', 300: '#5EEAD4', 400: '#2DD4BF',
          500: '#14B8A6', 600: '#0D9488', 700: '#0F766E', 800: '#115E59', 900: '#134E4A', 950: '#042F2E',
          DEFAULT: '#0D9488',
        },
      },
      fontFamily: {
        sans: ['Manrope', ...defaultTheme.fontFamily.sans],
        display: ['"Bricolage Grotesque"', ...defaultTheme.fontFamily.sans],
        serif: ['"Instrument Serif"', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', ...defaultTheme.fontFamily.mono],
      },
      spacing: { sidebar: '16rem', 'sidebar-collapsed': '4rem' },
      height: { header: '4rem' },
      boxShadow: { card: 'none', 'card-hover': 'none', modal: '0 4px 20px rgba(0,0,0,0.08)' },
      keyframes: {
        'fade-in': { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'slide-up': { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: { 'fade-in': 'fade-in 0.25s ease-out forwards', 'slide-up': 'slide-up 0.25s cubic-bezier(0.16,1,0.3,1) forwards' },
    },
  },
  plugins: [],
}
export default config
