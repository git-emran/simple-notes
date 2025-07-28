/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html', // Your main HTML file
    // Crucially, point to your renderer's source files
    './src/renderer/src/**/*.{js,ts,jsx,tsx}',
    './src/renderer/index.html' // If your renderer has its own HTML file
  ],
  theme: {
    extend: {}
  },
  plugins: [require('@tailwindcss/typography')]
}
