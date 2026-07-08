import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forge: {
          50: "#fdf6ec",
          100: "#f9e8cd",
          500: "#d97706",
          600: "#b45309",
          900: "#78350f",
        },
      },
    },
  },
  plugins: [],
};

export default config;
