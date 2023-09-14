/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    container: {
      center: true,
    },
    extend: {
      height: {
        '40p': '40px',
        '60p': '60px',
      },
      lineHeight: {
        '40p': '40px',
        '60p': '60px',
      }
    },
  },
  plugins: [],
}
