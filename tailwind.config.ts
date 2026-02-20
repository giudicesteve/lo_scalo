import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-euclid)"],
      },
      colors: {
        brand: {
          primary: "#F05A28",     // Arancione Lo Scalo
          "primary-hover": "#D94E22",
          cream: "#FFF5F0",       // Sfondo beige
          "cream-dark": "#F5E6DE",
          dark: "#231F20",        // Testo nero
          gray: "#6B6565",
          "light-gray": "#E8E0DC",
        },
      },
      fontSize: {
        "display-lg": ["57px", { lineHeight: "64px", letterSpacing: "-0.02em" }],
        "display-md": ["45px", { lineHeight: "52px", letterSpacing: "-0.02em" }],
        "display-sm": ["36px", { lineHeight: "44px", letterSpacing: "-0.02em" }],
        "headline-lg": ["32px", { lineHeight: "40px", letterSpacing: "-0.01em" }],
        "headline-md": ["28px", { lineHeight: "36px", letterSpacing: "-0.01em" }],
        "headline-sm": ["24px", { lineHeight: "32px", letterSpacing: "-0.01em" }],
        "title-lg": ["22px", { lineHeight: "26px" }],
        "title-md": ["16px", { lineHeight: "24px" }],
        "title-sm": ["14px", { lineHeight: "20px" }],
        "body-lg": ["16px", { lineHeight: "24px" }],
        "body-md": ["14px", { lineHeight: "20px" }],
        "body-sm": ["12px", { lineHeight: "16px" }],
        "label-lg": ["14px", { lineHeight: "20px" }],
        "label-md": ["12px", { lineHeight: "16px" }],
        "label-sm": ["11px", { lineHeight: "16px" }],
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
        "full": "9999px",
      },
      boxShadow: {
        "card": "0 2px 8px rgba(35, 31, 32, 0.08)",
        "card-hover": "0 4px 16px rgba(35, 31, 32, 0.12)",
      },
    },
  },
  plugins: [],
} satisfies Config;
