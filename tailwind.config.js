module.exports = {
  content: ['./**/*.html', './assets/js/*.js'],
  darkMode: 'class', // 'media' or 'class'
  theme: {
    extend: {},
  },
  plugins: [require('@tailwindcss/forms')],
};
