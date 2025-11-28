/**
 * Sitemap 자동 생성 스크립트
 * 
 * 빌드 시 자동으로 sitemap.xml을 생성합니다.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DOMAIN = 'https://yagovibe.com';
const currentDate = new Date().toISOString().split('T')[0];

const urls = [
  {
    loc: '/',
    priority: '1.0',
    changefreq: 'daily',
  },
  {
    loc: '/sports-hub',
    priority: '0.9',
    changefreq: 'daily',
  },
  {
    loc: '/app/market',
    priority: '0.9',
    changefreq: 'hourly',
  },
  {
    loc: '/voice-map',
    priority: '0.8',
    changefreq: 'daily',
  },
  {
    loc: '/start',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    loc: '/app/market/create',
    priority: '0.8',
    changefreq: 'daily',
  },
  {
    loc: '/app/admin/reports',
    priority: '0.7',
    changefreq: 'daily',
  },
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${DOMAIN}${url.loc}</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

const publicDir = path.join(__dirname, '..', 'public');
fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);

console.log('✅ Sitemap generated:', path.join(publicDir, 'sitemap.xml'));

