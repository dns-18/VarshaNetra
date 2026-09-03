/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Command center backgrounds
        'command': {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#0f1419',
        },
        
        // Surface colors
        'surface': {
          base: '#0f1419',      // deepest background
          secondary: '#1a1f2e', // secondary surfaces
          elevated: '#252d3d',  // cards/panels
          border: '#2d3142',    // borders
        },
        
        // Text colors
        'text': {
          primary: '#e5e7eb',    // high contrast
          secondary: '#9ca3af',  // supporting info
          muted: '#6b7280',      // tertiary info
          inverse: '#0f1419',    // for light backgrounds
        },
        
        // Risk state colors (semantic)
        'risk': {
          low: '#10b981',      // green - safe
          moderate: '#f59e0b', // amber - caution
          high: '#ef4444',     // orange-red - warning
          critical: '#dc2626', // red - danger
        },
        
        // System colors
        'status': {
          success: '#10b981',   // green
          warning: '#f59e0b',   // amber
          error: '#ef4444',     // red
          info: '#06b6d4',      // cyan
        },
      },
      
      backgroundColor: {
        DEFAULT: 'rgb(15, 20, 25)',
      },
      
      textColor: {
        DEFAULT: 'rgb(229, 231, 235)',
      },
      
      borderColor: {
        DEFAULT: 'rgb(45, 49, 66)',
        'surface-base': '#0f1419',
        'surface-secondary': '#1a1f2e',
        'surface-elevated': '#252d3d',
        'surface-border': '#2d3142',
      },
      
      spacing: {
        0: '0',
        px: '1px',
        0.5: '0.125rem',
        1: '0.25rem',
        2: '0.5rem',
        3: '0.75rem',
        4: '1rem',
        6: '1.5rem',
        8: '2rem',
        12: '3rem',
        16: '4rem',
        24: '6rem',
        32: '8rem',
      },
      
      typography: {
        DEFAULT: {
          css: {
            color: 'rgb(229, 231, 235)',
            'code::before': {
              content: '""',
            },
            'code::after': {
              content: '""',
            },
          },
        },
      },
      
      fontFamily: {
        sans: [
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'Consolas',
          'monospace',
        ],
      },
      
      fontSize: {
        xs: ['12px', { lineHeight: '1.5' }],
        sm: ['14px', { lineHeight: '1.5' }],
        base: ['16px', { lineHeight: '1.5' }],
        lg: ['18px', { lineHeight: '1.5' }],
        xl: ['20px', { lineHeight: '1.4' }],
        '2xl': ['24px', { lineHeight: '1.4' }],
        '3xl': ['30px', { lineHeight: '1.3' }],
        '4xl': ['36px', { lineHeight: '1.3' }],
      },
      
      fontWeight: {
        light: '300',
        normal: '400',
        medium: '500',
        semibold: '600',
        bold: '700',
      },
      
      boxShadow: {
        // Restrained shadows
        sm: 'rgba(0, 0, 0, 0.1) 0 1px 2px 0',
        DEFAULT: 'rgba(0, 0, 0, 0.1) 0 1px 3px 0, rgba(0, 0, 0, 0.06) 0 1px 2px 0',
        md: 'rgba(0, 0, 0, 0.1) 0 4px 6px -1px, rgba(0, 0, 0, 0.1) 0 2px 4px -1px',
        lg: 'rgba(0, 0, 0, 0.1) 0 10px 15px -3px, rgba(0, 0, 0, 0.05) 0 4px 6px -2px',
        xl: 'rgba(0, 0, 0, 0.1) 0 20px 25px -5px, rgba(0, 0, 0, 0.04) 0 10px 10px -5px',
        // Glow for active/operational states
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.3)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.3)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.3)',
      },
      
      borderRadius: {
        none: '0',
        sm: '0.25rem',
        DEFAULT: '0.375rem',
        md: '0.5rem',
        lg: '0.75rem',
        xl: '1rem',
        full: '9999px',
      },
    },
  },
  
  plugins: [],
  
  // Force dark mode
  darkMode: 'class',
}
