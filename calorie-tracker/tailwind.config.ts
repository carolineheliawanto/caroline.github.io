import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0fdf6',
          100: '#dcfce9',
          200: '#bbf7d5',
          300: '#86efb8',
          400: '#4ade93',
          500: '#22c274',
          600: '#16a35d',
          700: '#15804c',
          800: '#166540',
          900: '#145337',
        },
      },
    },
  },
  plugins: [],
};

export default config;
