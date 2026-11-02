/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        kbtu: {
          blue: '#0B3D91',
          hover: '#0A3278',
          accent: '#E8F0FE',
          border: '#D6E2F5',
          bg: '#F5F8FD',
          text: '#0F1F3D',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
