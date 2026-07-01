/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#060a13',         // Slate black / deep blue
          card: 'rgba(15, 23, 42, 0.45)', // Glassmorphic card fill
          border: 'rgba(255, 255, 255, 0.08)',
          text: '#f8fafc',
          muted: '#94a3b8',
          accentBlue: '#3b82f6',
          accentPurple: '#a855f7',
          accentCyan: '#06b6d4',
          accentGreen: '#10b981',
          accentRed: '#ef4444',
          accentOrange: '#f97316'
        }
      },
      backdropBlur: {
        xs: '2px',
        brand: '16px'
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(6, 182, 212, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(6, 182, 212, 0.6)' },
        }
      }
    },
  },
  plugins: [],
}
