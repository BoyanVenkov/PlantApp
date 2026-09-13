/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        leaf: {
          50: "#f0f9f1",
          100: "#dcf1de",
          200: "#b9e3bd",
          300: "#8ccf94",
          400: "#5cb568",
          500: "#3a9a48",
          600: "#2a7c38",
          700: "#236230",
          800: "#1f4f2a",
          900: "#0f5132",
          950: "#0a2e1c",
        },
        bark: "#5c4433",
        sun: "#f2b705",
      },
    },
  },
  plugins: [],
};
