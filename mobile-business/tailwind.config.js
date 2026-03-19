/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: 'var(--primary)',
        expense: 'var(--expense)',
        income: 'var(--income)',
        card: 'var(--card)',
        subtext: 'var(--subtext)',
        border: 'var(--border)',
        text: 'var(--foreground)',
        danger: 'var(--expense)',
        success: 'var(--income)',
        warning: '#f59e0b',
      },
    },
  },
  plugins: [],
};
