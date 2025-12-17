import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "var(--background)",
                foreground: "var(--foreground)",
                spotify: {
                    base: "#1DB954",
                    highlight: "#1ed760",
                    black: "#191414",
                    dark: "#121212",
                    text: {
                        base: "#FFFFFF",
                        muted: "#b3b3b3"
                    }
                }
            },
            fontFamily: {
                sans: ['var(--font-outfit)', 'sans-serif'],
            },
        },
    },
    plugins: [],
};
export default config;
