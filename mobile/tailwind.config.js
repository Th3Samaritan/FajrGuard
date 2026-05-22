/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#050C16',
        surface: '#0C1A2E',
        gold: '#C9A227',
        'gold-light': '#F0D060',
        teal: '#2DD4BF',
        'text-primary': '#F0E6D3',
      },
      fontFamily: {
        display: ['CormorantGaramond'],
        arabic: ['NotoNaskhArabic'],
        mono: ['JetBrainsMono'],
        body: ['CormorantGaramond'],
      },
    },
  },
  plugins: [],
};
