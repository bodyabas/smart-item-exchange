/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172026",
        muted: "#64727d",
        brand: "#0f766e",
        line: "#d9e1e7",
        surface: "#f7faf9",
      },
      boxShadow: {
        soft: "0 12px 30px rgba(23, 32, 38, 0.08)",
      },
    },
  },
  plugins: [],
};
