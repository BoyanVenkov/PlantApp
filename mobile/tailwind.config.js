/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  // "media" makes NativeWind throw on web whenever the <html> class changes.
  // The app has no dark: styles, so "class" changes nothing visually.
  darkMode: "class",
  theme: {
    extend: {
      // Bumped up from Tailwind's defaults (xs 12, sm 14, base 16...) for
      // readability on phones. Every screen uses these classes, so this is the
      // single knob for app-wide type size.
      fontSize: {
        xs: ["14px", { lineHeight: "20px" }],
        sm: ["16px", { lineHeight: "23px" }],
        base: ["18px", { lineHeight: "26px" }],
        lg: ["20px", { lineHeight: "28px" }],
        xl: ["23px", { lineHeight: "31px" }],
        "2xl": ["27px", { lineHeight: "34px" }],
        "3xl": ["32px", { lineHeight: "38px" }],
      },
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
