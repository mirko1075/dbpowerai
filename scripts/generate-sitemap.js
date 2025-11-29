import { SitemapStream, streamToPromise } from 'sitemap';
import { createWriteStream } from 'fs';
import path from 'path';

// 👉 Modifica CON IL TUO dominio
const SITE_URL = 'https://www.dbpowerai.com';

const routes = [
  '/', 
  '/pricing',
  '/login',
  '/dashboard',
  '/analyze',
  // aggiungi qui eventuali altre rotte
];

async function generateSitemap() {
  const sitemap = new SitemapStream({ hostname: SITE_URL });

  const writePath = path.resolve('./dist/sitemap.xml');
  const writeStream = createWriteStream(writePath);

  sitemap.pipe(writeStream);

  routes.forEach((route) => {
    sitemap.write({ url: route, changefreq: 'weekly', priority: 0.8 });
  });

  sitemap.end();

  await streamToPromise(sitemap);
  console.log('✅ Sitemap generata in dist/sitemap.xml');
}

generateSitemap();
