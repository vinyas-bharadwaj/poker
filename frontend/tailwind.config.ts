import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1280px',
      },
    },
    extend: {
      fontFamily: {
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'Times', 'serif'],
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        parchment: {
          50: '#FDFBF7',
          100: '#FAF7F2',
          200: '#F5F0E6',
          300: '#EDE6D8',
          400: '#DFD5C2',
          500: '#C7B9A0',
        },
        felt: {
          light: '#2d6a4f',
          DEFAULT: '#1e4d38',
          dark: '#143827',
          border: '#3c2415', // Rich mahogany leather rail
        },
        brass: {
          light: '#dfba6f',
          DEFAULT: '#c5a059',
          dark: '#a8823d',
        },
        wine: {
          DEFAULT: '#8b2635',
          dark: '#681c27',
        },
        espresso: {
          DEFAULT: '#2c2523',
          muted: '#6e655f',
          light: '#938982',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        classic: '0 2px 12px -2px rgba(44, 37, 35, 0.06), 0 1px 3px 0 rgba(44, 37, 35, 0.04)',
        paper: '0 4px 20px -2px rgba(44, 37, 35, 0.08), 0 1px 4px 0 rgba(44, 37, 35, 0.04)',
        felt: 'inset 0 2px 8px rgba(0, 0, 0, 0.35), 0 8px 24px rgba(44, 37, 35, 0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
