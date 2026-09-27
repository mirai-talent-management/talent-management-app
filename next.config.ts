import type { NextConfig } from 'next'
const config: NextConfig = {
  devIndicators: false,
  // Keep build verification separate from an already-running local preview.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  async headers() {
    return [{source:'/action-board-demo/:path*',headers:[
      {key:'X-Robots-Tag',value:'noindex, nofollow'},
      // Local integration demo: browser connections and assets stay on this origin.
      {key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"},
    ]}]
  },
}
export default config
