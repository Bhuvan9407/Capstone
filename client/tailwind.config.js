export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0b1f3a',
          50: '#16294a',
        },
        surface: '#f5f8ff',
        accent: {
          purple: '#7c3aed',
          cyan: '#06b6d4',
          green: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15,23,42,.06), 0 1px 3px rgba(15,23,42,.08)',
        pop: '0 8px 24px rgba(15,23,42,.12)',
      },
      borderRadius: { xl2: '1rem' },
    },
  },
  plugins: [],
};
