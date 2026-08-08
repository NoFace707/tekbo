/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Paleta Tekbo: azul oscuro institucional + verde claro
        brand: {
          50: "#e8eaf6",
          100: "#c5cae9",
          200: "#9fa8da",
          300: "#7986cb",
          400: "#5c6bc0",
          500: "#3f51b5",
          600: "#1a237e",
          700: "#00177a",
          800: "#000e51",
          900: "#000838",
          950: "#00051f",
        },
        lime: {
          50: "#f6fbec",
          100: "#f1f8e9",
          200: "#e8f5e9",
          300: "#dcedc8",
          400: "#c5e1a5",
          500: "#aed581",
          600: "#8bc34a",
          700: "#7cb342",
          800: "#558b2f",
          900: "#33691e",
        },
        tekbo: {
          dark: "#000e51",
          darkHover: "#1a237e",
          darkLight: "#e0e7ff",
          accent: "#7cb342",
          accentHover: "#558b2f",
          accentSoft: "#f1f8e9",
          accentBorder: "#8bc34a",
          orange: "#ff7b00",
          orangeDeep: "#e65100",
          print: "#00c853",
        },
      },
      fontFamily: {
        display: ['"Sora"', '"Inter"', "sans-serif"],
        tekbo: ['"Oswald"', "sans-serif"],
        body: ['"Montserrat"', '"Inter"', "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
