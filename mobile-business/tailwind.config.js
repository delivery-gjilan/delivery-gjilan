/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#0b89a9',
        background: '#000000',
        card: '#1f2937',
        text: '#f9fafb',
        subtext: '#9ca3af',
        danger: '#ef4444',
        success: '#10b981',
        warning: '#f59e0b',
      },
    },
  },
  plugins: [],
};
