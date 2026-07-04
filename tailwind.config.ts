import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#FAFAFA',
        surface: '#FFFFFF',
        'surface-2': '#F3F1F1',
        accent: {
          DEFAULT: '#BA181B',
          bright: '#E5383B',
          deep: '#8A1417',
        },
        danger: '#C81E1E',
        income: '#1F8A4C',
        muted: '#8A8482',
        line: '#E7E3E2',
        soft: '#1B1717',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        card: '1.5rem',
      },
      boxShadow: {
        card: '0 1px 2px rgba(0,0,0,0.04)',
      },
    },
  },
  plugins: [],
} satisfies Config;
