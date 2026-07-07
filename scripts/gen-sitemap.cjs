/**
 * 构建时生成 sitemap.xml 到 dist/
 *
 * 遍历所有内置模板生成详情页 URL，加上首页和分类页。
 * 使用 hash 路由（#template/<id>）的 URL 也提交，作为 SPA 的补充。
 */
const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = 'https://yangge521.github.io/beads-template';
const DATA_DIR = path.join(__dirname, '..', 'src', 'data');
const DIST_FILE = path.join(__dirname, '..', 'dist', 'sitemap.xml');

// 与 src/App.tsx 导入顺序保持一致的分类列表
const CATEGORY_IDS = [
  'anime', 'pokemon', 'celebrity', 'food', 'animals', 'holiday',
  'kawaii', 'pixel3d', 'pixelart', 'emoji', 'seasonal', 'collab',
  'nature', 'portrait', 'abstract', 'logo',
];

/** 从所有 data JSON 收集模板 id */
function collectTemplateIds() {
  const ids = [];
  for (const file of fs.readdirSync(DATA_DIR)) {
    if (!file.endsWith('.json')) continue;
    const data = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8'));
    if (!Array.isArray(data)) continue;
    for (const tpl of data) {
      if (tpl && typeof tpl.id === 'string') ids.push(tpl.id);
    }
  }
  return ids;
}

function xmlEscape(s) {
  return s.replace(/[<>&'"]/g, c => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]));
}

function main() {
  const templateIds = collectTemplateIds();
  const today = new Date().toISOString().slice(0, 10);

  const urls = [];

  // 首页
  urls.push(`  <url>
    <loc>${BASE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

  // 每个模板详情页（hash 路由）
  for (const id of templateIds) {
    urls.push(`  <url>
    <loc>${BASE_URL}/#/template/${xmlEscape(id)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  // 分类页
  for (const cat of CATEGORY_IDS) {
    urls.push(`  <url>
    <loc>${BASE_URL}/#/?cat=${cat}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
  }

  // 二级页面
  const subPages = ['favorites', 'colors', 'community', 'compare', 'profile', 'upload', 'editor', 'ai'];
  for (const p of subPages) {
    urls.push(`  <url>
    <loc>${BASE_URL}/#/${p}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;

  // 确保 dist 目录存在
  const distDir = path.dirname(DIST_FILE);
  if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });

  fs.writeFileSync(DIST_FILE, xml, 'utf8');
  console.log(`[gen-sitemap] 已生成 ${DIST_FILE}，共 ${urls.length} 个 URL`);
}

main();
