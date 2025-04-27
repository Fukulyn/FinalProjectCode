/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        'loading-bar': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        },
        ripple: {
          '0%': { transform: 'scale(0.8)', opacity: 1 },
          '100%': { transform: 'scale(2)', opacity: 0 }
        },
        'fade-in': {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        },
        'bounce-dot': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' }
        }
      },
      animation: {
        'loading-bar': 'loading-bar 2s ease-in-out infinite',
        'ripple': 'ripple 2s ease-out infinite',
        'ripple-delay': 'ripple 2s ease-out 1s infinite',
        'fade-in': 'fade-in 0.6s ease-out forwards',
        'fade-in-delay': 'fade-in 0.6s ease-out 0.3s forwards',
        'bounce-delay-1': 'bounce-dot 1s ease-in-out 0.1s infinite',
        'bounce-delay-2': 'bounce-dot 1s ease-in-out 0.2s infinite',
        'bounce-delay-3': 'bounce-dot 1s ease-in-out 0.3s infinite'
      }
    },
  },
  plugins: [],
};