/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: '#FF5A5F',
        secondary: '#6B4EFF',
        tertiary: '#00D09E',
        background: '#FFFFFF',
        surface: '#F7F8FA',
        text: {
          headline: '#1E1E1E',
          body: '#868E96',
        }
      },
      fontFamily: {
        manrope: ['Manrope', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
