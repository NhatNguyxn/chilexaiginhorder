import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kraft: {
          DEFAULT: "#F2EAD4",
          soft: "#F8F2E4",
          card: "#FFFDF9",
          dark: "#E3D7BC",
        },
        pine: {
          DEFAULT: "#22301E",
          deep: "#1B2A21",
          2: "#2D4737",
          light: "#3E5C49",
        },
        moss: {
          DEFAULT: "#6E7F55",
          soft: "#8B9873",
          light: "#EAF0E2",
        },
        brass: {
          DEFAULT: "#AD8B52",
          soft: "#C7AD7C",
          light: "#F5ECD7",
        },
        clay: {
          DEFAULT: "#8E3E21",
          hover: "#78331A",
          soft: "#FCEEEA",
        },
        plum: {
          DEFAULT: "#732528",
          bg: "#F6EFE6",
        },
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "serif"],
        sans: ["var(--font-be-vietnam)", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px -10px rgba(34, 48, 30, 0.15)",
        floating: "0 20px 40px -15px rgba(27, 42, 33, 0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
