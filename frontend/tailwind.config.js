/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        plum: {
          DEFAULT: '#2E003E',
          primary: '#2E003E',
          dark: '#1F002B',
          light: '#4A155E',
          muted: '#3D0D52',
          bg: '#F8F3F9',
          50: '#FDFBFE',
          100: '#F8F3F9',
          200: '#E8DDEB',
          300: '#C9B0D1',
          400: '#A479B3',
          500: '#7B4292',
          600: '#521D6C',
          700: '#3D0D52',
          800: '#2E003E',
          900: '#1F002B',
        },
        pink: {
          DEFAULT: '#FFB7C5',
          soft: '#FFB7C5',
          light: '#FFF0F3',
          hover: '#FFA5B7',
          50: '#FFF8F9',
          100: '#FFF0F3',
          200: '#FFD6DF',
          300: '#FFB7C5',
          400: '#FF8FA6',
          500: '#FF6687',
        },
        minnie: {
          bg: '#F8F3F9',
          card: '#FFFFFF',
          text: '#241A26',
          muted: '#756A78',
          border: '#E8DDEB',
        }
      }
    },
  },
  plugins: [],
}
