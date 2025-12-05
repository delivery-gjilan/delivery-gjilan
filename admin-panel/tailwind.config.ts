/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
    "./src/lib/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        primary: "var(--primary)",
        expense: "var(--expense)",
        income: "var(--income)",
        card: "var(--card)",
        subtext: "var(--subtext)",
        border: "var(--border)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
