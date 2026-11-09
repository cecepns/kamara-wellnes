export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: { gold: { 50: '#faf6ea', 100: '#f1e8c8', 500: '#ae9142', 600: '#968036', 700: '#7a6a2d' }, ink: { 800: '#1f2927', 900: '#151d1b' } },
    fontFamily: { sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'] },
  } },
  plugins: [],
};
