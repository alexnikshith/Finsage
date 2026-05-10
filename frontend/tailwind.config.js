/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#ffffff",
        secondary: "#a1a1aa",
        dark: "#000000",
        glass: "rgba(255, 255, 255, 0.03)",
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
