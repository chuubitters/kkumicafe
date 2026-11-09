/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#fbf3e4',
        paper: '#f6e7e4',
        blush: '#f6c9d3',
        rose: '#e98aa3',
        cherry: '#c8203a',
        wine: '#7a1f2b',
        cocoa: '#5a3426',
        butter: '#fbe7a1',
        lavender: '#cdbbe8',
        mint: '#bfe3cf',
        sky: '#bcd9f0',
      },
      fontFamily: {
        script: ['Pacifico', 'cursive'],
        hand: ['Caveat', 'cursive'],
        serif: ['"Playfair Display"', 'serif'],
        retro: ['Shrikhand', 'cursive'],
        ui: ['Fredoka', 'system-ui', 'sans-serif'],
        dance: ['"Dancing Script"', 'cursive'],
      },
      boxShadow: {
        soft: '0 10px 30px -10px rgba(122,31,43,.35)',
        card: '0 4px 0 #7a1f2b22, 0 14px 30px -12px rgba(122,31,43,.35)',
      },
    },
  },
  plugins: [],
};
