import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#19414D",
          light: "#276578",
          dark: "#0F2A33",
        },
        secondary: {
          DEFAULT: "#FF8FA3",
          light: "#FFB3C1",
        },
      },
    },
  },
  plugins: [],
};

export default config;
