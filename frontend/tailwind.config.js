/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#070A12',
          900: '#0B0F19',
          850: '#0F1626',
          800: '#131B2E',
          700: '#1E293B',
          600: '#334155'
        },
        brand: {
          purple: {
            light: '#C084FC',
            DEFAULT: '#A855F7',
            dark: '#7E22CE'
          },
          blue: {
            light: '#60A5FA',
            DEFAULT: '#3B82F6',
            dark: '#1D4ED8'
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-purple': '0 0 25px -5px rgba(168, 85, 247, 0.25)',
        'glow-blue': '0 0 25px -5px rgba(59, 130, 246, 0.25)',
      }
    },
  },
  plugins: [],
}

