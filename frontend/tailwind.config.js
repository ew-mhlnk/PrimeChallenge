/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Подключаем наши переменные из layout.tsx
        cyber: ['var(--font-cyber)', 'sans-serif'],
        visby: ['var(--font-visby)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};