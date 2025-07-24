module.exports = {
  content: [
    './apps/web/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
      },
    },
  },
  plugins: [],
};
