/** @type {import('next').NextConfig} */
const nextConfig = {
  // ДОБАВЬ ЭТУ СТРОКУ:
  output: "standalone", 
  
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', 
      },
    ],
  },
};

export default nextConfig;