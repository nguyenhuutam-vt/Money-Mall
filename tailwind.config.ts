import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#123027",
        emerald: "#059669",
        mint: "#34d399",
        leaf: "#eafff5",
        paper: "#f7fef9"
      }
    }
  },
  plugins: []
};

export default config;
