import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ZenConnect Brand Colors
        primary: {
          50: '#EEF4FF',
          600: '#1E5BD8',
          700: '#1848AE',
        },
        accent: {
          600: '#0FA7A7',
        },
        neutral: {
          50: '#F8FAFC',
          200: '#E2E8F0',
          500: '#64748B',
          700: '#334155',
          900: '#0F172A',
        },
        success: {
          50: '#ECFDF5',
          600: '#10B981',
        },
        warn: {
          50: '#FFFBEB',
          600: '#F59E0B',
        },
        error: {
          50: '#FEF2F2',
          600: '#EF4444',
        },
        info: {
          50: '#EFF6FF',
          600: '#3B82F6',
        },
        // Theme variables
        background: 'var(--zc-bg)',
        foreground: 'var(--zc-text)',
        card: 'var(--zc-card)',
        'card-foreground': 'var(--zc-text)',
        popover: 'var(--zc-surface)',
        'popover-foreground': 'var(--zc-text)',
        muted: 'var(--zc-neutral-50)',
        'muted-foreground': 'var(--zc-subtext)',
        border: 'var(--zc-border)',
        input: 'var(--zc-border)',
        ring: 'var(--zc-primary-50)',
      },
      borderRadius: {
        xs: '6px',
        sm: '10px',
        md: '14px',
        lg: '18px',
        xl: 'var(--zc-radius-lg)',
      },
      boxShadow: {
        zc1: '0 1px 2px rgba(16,24,40,.06), 0 1px 1px rgba(16,24,40,.1)',
        zc2: '0 8px 20px rgba(23,42,79,.12)',
      },
      fontFamily: {
        sans: ['var(--zc-font-sans)'],
        mono: ['var(--zc-font-mono)'],
      },
      fontSize: {
        xs: 'var(--zc-text-xs)',
        sm: 'var(--zc-text-sm)',
        base: 'var(--zc-text-md)',
        lg: 'var(--zc-text-lg)',
        xl: 'var(--zc-text-xl)',
        '2xl': 'var(--zc-display-sm)',
        '3xl': 'var(--zc-display-md)',
        '4xl': 'var(--zc-display-lg)',
      },
      spacing: {
        '1': 'var(--zc-gap-1)',
        '2': 'var(--zc-gap-2)',
        '3': 'var(--zc-gap-3)',
        '4': 'var(--zc-gap-4)',
        '6': 'var(--zc-gap-6)',
        '8': 'var(--zc-gap-8)',
      },
      transitionTimingFunction: {
        'zc': 'var(--zc-ease)',
      },
      transitionDuration: {
        'fast': 'var(--zc-speed-fast)',
        'med': 'var(--zc-speed-med)',
        'slow': 'var(--zc-speed-slow)',
      },
    },
  },
  plugins: [],
};

export default config;




