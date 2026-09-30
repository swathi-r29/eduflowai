/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          blue: '#2563EB',
          'blue-light': '#3B82F6',
          sky: '#00A3FF',
          'sky-light': '#38BDF8',
          indigo: '#4F46E5',
          violet: '#7C3AED',
          'violet-light': '#8B5CF6',
          amber: '#D97706',
          emerald: '#10B981',
          navy: '#0F172A'
        },
        surface: {
          page: '#F8FAFC',
          card: '#FFFFFF',
          subtle: '#F1F5F9',
          muted: '#F8FAFC'
        },
        base: { 950: '#0a0a12', 900: '#0f0f1a', 800: '#161625', 700: '#1f1f33' }
      },
      boxShadow: {
        'glow-blue': '0 10px 25px -5px rgba(37, 99, 235, 0.25)',
        'card-soft': '0 10px 30px -10px rgba(15, 23, 42, 0.05)'
      }
    }
  },
  plugins: []
};
