/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  darkMode: ["class"],
  theme: {
    extend: {
      colors: {
        // Semantic color tokens wired to CSS variables (defined in globals.css)
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)"
        },
        surface: {
          DEFAULT: "rgb(var(--surface) / <alpha-value>)",
          muted: "rgb(var(--surface-muted) / <alpha-value>)"
        },
        text: {
          primary: "rgb(var(--text-primary) / <alpha-value>)",
          secondary: "rgb(var(--text-secondary) / <alpha-value>)"
        },
        border: {
          subtle: "rgb(var(--border-subtle) / <alpha-value>)"
        },
        success: "rgb(var(--success) / <alpha-value>)",
        warn: "rgb(var(--warn) / <alpha-value>)",
        error: "rgb(var(--error) / <alpha-value>)"
      },
      borderRadius: {
        sm: "0.375rem",
        md: "0.5rem",
        lg: "0.75rem",
        xl: "1rem"
      },
      boxShadow: {
        soft: "0 1px 2px 0 rgba(0,0,0,0.04), 0 1px 1px -1px rgba(0,0,0,0.06)",
        sheet: "0 -8px 24px rgba(0,0,0,0.08)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "Arial"]
      }
    }
  },
  plugins: []
};
