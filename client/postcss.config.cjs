module.exports = {
  // Use the new Tailwind PostCSS integration package
  plugins: [
    require('@tailwindcss/postcss')(),
    require('autoprefixer')(),
  ],
};
