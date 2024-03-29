/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			fontFamily: {
				barriecito: ['Barriecito', 'sans-serif'],
				neucha: ['Neucha', 'sans-serif'],
				dokdo: ['Dokdo', 'sans-serif']
			}
		}
	},
	plugins: [require('tailwind-scrollbar'), require('tailwindcss-textshadow')]
};
