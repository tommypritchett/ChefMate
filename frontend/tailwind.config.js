/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        serif: ['PlayfairDisplay_400Regular'],
        'serif-semibold': ['PlayfairDisplay_600SemiBold'],
        'serif-bold': ['PlayfairDisplay_700Bold'],
        'serif-extrabold': ['PlayfairDisplay_800ExtraBold'],
        'serif-italic': ['PlayfairDisplay_400Regular_Italic'],
        sans: ['DMSans_400Regular'],
        'sans-light': ['DMSans_300Light'],
        'sans-medium': ['DMSans_500Medium'],
        'sans-semibold': ['DMSans_600SemiBold'],
        'sans-bold': ['DMSans_700Bold'],
      },
      colors: {
        primary: {
          50: '#FFF7F0',
          100: '#FFF0E8',
          200: '#FDDCC9',
          300: '#F5C0A0',
          400: '#E8945A',
          500: '#D4652E',
          600: '#B8521F',
          700: '#9A4419',
          800: '#7C3614',
          900: '#5E2810',
        },
        cream: {
          DEFAULT: '#FFFBF5',
          dark: '#F5EDE3',
          deeper: '#EDE3D5',
        },
        warm: {
          dark: '#2D2520',
          soft: '#3D3530',
          DEFAULT: '#5C4F45',
        },
        brown: {
          light: '#B8A68E',
          DEFAULT: '#8B7355',
          dark: '#6B5840',
        },
        orange: {
          light: '#FFF0E8',
          soft: '#FDDCC9',
          DEFAULT: '#D4652E',
          dark: '#B8521F',
        },
      },
    },
  },
  plugins: [],
};
