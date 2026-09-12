import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        border: 'var(--color-border)',
        muted: 'var(--color-muted)',
        foreground: 'var(--color-foreground)',
        accent: 'var(--color-accent)',
        'accent-cyan': 'var(--color-accent-cyan)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      backdropBlur: {
        glass: 'var(--glass-blur)',
      },
      transitionTimingFunction: {
        mechanical: 'var(--ease-mechanical)',
        damped: 'var(--ease-damped)',
      },
      boxShadow: {
        glass: 'var(--shadow-glass)',
      },
    },
  },
  plugins: [],
} satisfies Config
