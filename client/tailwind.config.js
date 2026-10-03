/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0a0a0a',
          soft: '#141414',
        },
        brand: {
          950: '#0a0a0a',
          900: '#111111',
          800: '#181818',
          700: '#1f1f1f',
          600: '#2a2a2a',
        },
        ivory: {
          DEFAULT: '#f7f6f3',
          dark: '#efeee9',
        },
        gold: {
          DEFAULT: '#a8895c',
          light: '#c4a878',
          dark: '#8a6f45',
        },
      },
      fontFamily: {
        sans: ['Vazir', 'Vazirmatn', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        luxe: '0.3em',
        wide2: '0.18em',
      },
      maxWidth: {
        content: '1280px',
      },
    },
  },
  plugins: [],
};
