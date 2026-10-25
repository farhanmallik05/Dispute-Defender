import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        paypal: {
          blue: '#003087',
          darkBlue: '#001c64',
          lightBlue: '#0070ba',
          yellow: '#ffc439',
        }
      },
    },
  },
  plugins: [],
};
export default config;
