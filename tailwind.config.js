/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nexus: {
          page: '#F4F6F9',
          card: '#FFFFFF',
          sidebar: '#1A2035',
          'sidebar-active': '#243049',
          'sidebar-text': '#A8B4CC',
          input: '#F8FAFC',
          'input-border': '#CBD5E1',
          topbar: '#FFFFFF',
          primary: '#0F1B2D',
          secondary: '#64748B',
          muted: '#94A3B8',
          accent: '#1E40AF',
          'accent-secondary': '#0EA5E9',
          success: '#16A34A',
          warning: '#D97706',
          danger: '#DC2626',
          info: '#2563EB',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Arial', 'sans-serif'],
      },
      animation: {
        'ticker': 'ticker 40s linear infinite',
        'shimmer': 'shimmer 1.5s linear infinite',
      },
      keyframes: {
        ticker: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
    },
  },
  plugins: [],
};

