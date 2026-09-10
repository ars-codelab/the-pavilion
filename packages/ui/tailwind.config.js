/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        pavilion: {
          bg: '#0e1a14',
          panel: '#15261c',
          line: '#2c4736',
          ink: '#e8e2cf',
          dim: '#8fae97',
          accent: '#d9a441',
          danger: '#c0562f',
        },
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
