import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
    width: 512,
    height: 512,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
    return new ImageResponse(
        (
            // ImageResponse JSX element
            <div
                style={{
                    fontSize: 24,
                    background: '#0f0c29',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '0px', // Icons usually shouldn't have border-radius in the file itself (OS handles it), but for web favicon it's fine. 
                    // However, for consistency with PWA maskable icons, we keep it square-ish or let OS mask it.
                    // Let's create a full bleed background.
                }}
            >
                {/* Abstract Neural/Brain Logo */}
                <div
                    style={{
                        display: 'flex',
                        position: 'relative',
                        width: '300px',
                        height: '300px',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                >
                    {/* Main Glow */}
                    <div
                        style={{
                            position: 'absolute',
                            width: '100%',
                            height: '100%',
                            background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, rgba(15,12,41,0) 70%)',
                            filter: 'blur(20px)',
                        }}
                    />

                    {/* Central Neural Node */}
                    <svg
                        width="256"
                        height="256"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ zIndex: 10 }}
                    >
                        <path
                            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20Z"
                            fill="url(#paint0_linear)"
                            opacity="0.3"
                        />
                        <path
                            d="M12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6ZM12 16C9.79 16 8 14.21 8 12C8 9.79 9.79 8 12 8C14.21 8 16 9.79 16 12C16 14.21 14.21 16 12 16Z"
                            fill="url(#paint1_linear)"
                        />
                        {/* Neural Connections */}
                        <path d="M12 8V6" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                        <path d="M12 18V16" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                        <path d="M8 12H6" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                        <path d="M18 12H16" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
                        <circle cx="12" cy="12" r="2" fill="white" />

                        <defs>
                            <linearGradient id="paint0_linear" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#8B5CF6" />
                                <stop offset="1" stopColor="#3B82F6" />
                            </linearGradient>
                            <linearGradient id="paint1_linear" x1="6" y1="6" x2="18" y2="18" gradientUnits="userSpaceOnUse">
                                <stop stopColor="#8B5CF6" />
                                <stop offset="1" stopColor="#3B82F6" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            </div>
        ),
        {
            ...size,
        }
    );
}
