/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        muted: "#5d6b82",
        line: "#d9e0ea",
        panel: "#f7f9fc",
        brand: "#0f766e",
        "brand-dark": "#115e59",
        accent: "#1d4ed8",
      },
      fontFamily: {
        sans: [
          "Inter",
          "Noto Sans SC",
          "Microsoft YaHei",
          "system-ui",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
