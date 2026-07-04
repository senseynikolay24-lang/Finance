import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0B090A',
        surface: '#161A1D',
        'surface-2': '#1F252A',
        accent: {
          DEFAULT: '#BA181B',
          bright: '#E5383B',
          deep: '#660708',
        },
        danger: '#A4161A',
        income: '#2E9E5B',
        muted: '#B1A7A6',
        line: '#D3D3D3',
        soft: '#F5F3F4',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        card: '1.5rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
