import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        eucalyptus: {
          DEFAULT: "hsl(var(--eucalyptus))",
          muted: "hsl(var(--eucalyptus-muted))",
        },
        rose: {
          soft: "hsl(var(--rose-soft))",
          foreground: "hsl(var(--rose-foreground))",
        },
        cream: "hsl(var(--cream))",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "Georgia", "serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        card: "1rem",
      },
      boxShadow: {
        card:
          "0 4px 28px -6px hsl(160 18% 45% / 0.12), 0 2px 10px -4px hsl(160 15% 35% / 0.08)",
        "card-hover":
          "0 8px 36px -8px hsl(160 20% 40% / 0.16), 0 4px 14px -4px hsl(160 15% 35% / 0.1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
