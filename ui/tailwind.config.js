/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                primary: '#9E7658',
                secondary: {
                    light: '#EDE7DB',
                    dark: '#353738',
                }
            }
        },
    },
    plugins: [],
}
