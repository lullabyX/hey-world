import baseConfig from '../../tailwind.config';

/** @type {import('tailwindcss').Config} */
export default {
  ...baseConfig,
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/components/src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/lib/src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  plugins: [require('tailwindcss-animate')],
};
