// tailwind.config.ts
/** @type {import('tailwindcss').Config} */
const config = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                yago: {
                    purple: '#4F46E5',
                    gradientStart: '#6366F1',
                    gradientEnd: '#A78BFA',
                    pink: '#EC4899',
                    blue: '#3B82F6',
                    gray: '#6B7280',
                    soft: '#F3F4F6',
                    dark: '#1F2937',
                    light: '#F9FAFB',
                },
            },
            fontFamily: {
                sans: ['Noto Sans KR', 'Poppins', 'sans-serif'],
                display: ['Poppins', 'Noto Sans KR', 'sans-serif'],
            },
            backgroundImage: {
                'yago-gradient': 'linear-gradient(135deg, #6366F1 0%, #A78BFA 100%)',
                'yago-gradient-dark': 'linear-gradient(135deg, #4F46E5 0%, #6366F1 100%)',
                'yago-gradient-pink': 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
            },
            boxShadow: {
                'yago': '0 4px 6px -1px rgba(79, 70, 229, 0.1), 0 2px 4px -1px rgba(79, 70, 229, 0.06)',
                'yago-lg': '0 10px 15px -3px rgba(79, 70, 229, 0.1), 0 4px 6px -2px rgba(79, 70, 229, 0.05)',
            },
            animation: {
                'yago-pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'yago-bounce': 'bounce 1s infinite',
            }
        },
    },
    plugins: [],
}

export default config
