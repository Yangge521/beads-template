# i18n 国际化实施方案（中英文切换）

> 适用项目：`beads-template`（React 19 + TypeScript + Vite，纯前端）
> 本文档仅做方案准备，不修改 `src` 下任何文件。实施时按"实施步骤清单"逐文件落地。

---

## 1. 背景与目标

当前项目所有可见文案均为硬编码中文，分布在 `App.tsx`、`HomePage.tsx`、`DetailPage.tsx`、`FavoritesPage.tsx`、`ColorReferencePage.tsx`、`Navbar.tsx`、`ShortcutHelp.tsx`、`TemplateCard.tsx`、`FavoriteButton.tsx`、`ToastContainer.tsx`、`categories.ts`，以及 `index.html` 的静态 meta/title。

**目标**：在不引入重型第三方库的前提下，实现中英文（`zh` / `en`）运行时切换，用户选择持久化到 `localStorage`，并保持与现有 `ThemeContext` 一致的代码风格与持久化策略。

**范畴边界（重要）**：
- ✅ 翻译 **UI 文案**：按钮、标题、占位符、aria-label、toast、document.title、空状态、模态框、打印清单表头等。
- ❌ **不翻译数据内容**：`data/*.json` 中的模板 `name` / `description` / `tags`、`beadColors.ts` 中的颜色 `name` 与分组 `name` 属于领域内容数据，体量大且与品牌色号强绑定，不在本期范围内。
  - 若后续需要，可作为独立增强：为 `BeadTemplate` 增加 `nameEn` / `descEn` 字段，或为 `ColorGroup` 增加 `nameEn`，并在渲染层按 `lang` 选择字段。本文档第 10 节给出建议。
- 分类（`categories.ts`）的 `name` / `description` 虽是数据，但数量少且属导航 UI，**纳入本期翻译**（见第 5、11 节）。

---

## 2. 推荐方案：自建轻量 i18n Context

### 2.1 为什么不用 i18next / react-i18next

| 维度 | i18next 生态 | 自建 Context（推荐） |
|------|--------------|----------------------|
| 包体积 | i18next + react-i18next ≈ 40KB+（gzipped 仍可观） | 0 依赖，<1KB 运行时代码 |
| 学习成本 | 需了解 namespace、interpolation、plurals、suspense 等概念 | 一个 Context + 一个 `t()` 函数 |
| 功能匹配度 | 大量功能（复数、日期、懒加载命名空间）本项目用不到 | 仅需键值查找 + `{var}` 插值 + 持久化 |
| 现有模式契合 | 与 `ThemeContext` 风格不一致 | 与 `ThemeContext` 完全同构，团队心智一致 |
| 构建配置 | 需配置 loader / 资源打包 | 普通 TS 模块，Vite 原生处理 |

本项目仅 2 种语言、纯前端、文案量约 200 键、无复数与日期格式化诉求，自建方案完全胜任，且能复用 `ThemeContext` 的持久化 / 跨标签页同步模式。

### 2.2 文件结构建议

```
src/
├── context/
│   ├── ThemeContext.tsx          # 已有，参考样板
│   └── LanguageContext.tsx       # 新增：Provider + useTranslation hook
├── i18n/
│   ├── translations.ts           # 新增：zh / en 两个字典（扁平 Record<string,string>）
│   └── types.ts                  # 新增：Language 类型、TranslationParams 类型（可选，也可内联）
```

> 将字典独立到 `i18n/translations.ts`，避免 Context 文件膨胀；Context 只负责状态与 `t` 函数。

---

## 3. API 设计草图

### 3.1 类型与 Context

```ts
// src/i18n/types.ts
export type Language = 'zh' | 'en';
export type TranslationParams = Record<string, string | number>;
```

```ts
// src/context/LanguageContext.tsx
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Language, TranslationParams } from '../i18n/types';
import { translations } from '../i18n/translations';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  /** 翻译函数：t('home.hero.title') 或带插值 t('nav.favorites.ariaLabel', { count: 3 }) */
  t: (key: string, params?: TranslationParams) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'zh',
  setLang: () => {},
  toggleLang: () => {},
  t: (k) => k,
});

const STORAGE_KEY = 'beads-lang';

function detectInitialLang(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (stored === 'zh' || stored === 'en') return stored;
  } catch {}
  // 首次访问：跟随浏览器语言（与 ThemeContext 跟随系统主题的思路一致）
  if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('en')) {
    return 'en';
  }
  return 'zh';
}

function translate(lang: Language, key: string, params?: TranslationParams): string {
  const dict = translations[lang] as Record<string, string>;
  // 1) 当前语言命中；2) 回退到 zh；3) 再回退到 key 本身，便于发现遗漏
  let str = dict[key] ?? (translations.zh as Record<string, string>)[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(detectInitialLang);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
    document.documentElement.lang = next === 'en' ? 'en' : 'zh-CN';
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'zh' ? 'en' : 'zh');
  }, [lang, setLang]);

  // 初始挂载时同步 <html lang>，供无障碍与 SEO
  useEffect(() => {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-CN';
  }, [lang]);

  // 跨标签页同步（与 ThemeContext 一致）
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'zh' || e.newValue === 'en')) {
        setLangState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const t = useCallback(
    (key: string, params?: TranslationParams) => translate(lang, key, params),
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used within LanguageProvider');
  return ctx;
}
```

### 3.2 字典组织（扁平键）

```ts
// src/i18n/translations.ts
import type { Language } from './types';

export const translations: Record<Language, Record<string, string>> = {
  zh: {
    'app.name': '拼豆收集',
    'home.hero.title': '拼豆模板收集',
    'nav.search.placeholder': '搜索模板...',
    // ... 完整对照表见第 5 节
  },
  en: {
    'app.name': 'Perler Bead Collection',
    'home.hero.title': 'Perler Bead Template Collection',
    'nav.search.placeholder': 'Search templates...',
    // ...
  },
};
```

### 3.3 在 App 中挂载

```tsx
// src/App.tsx（仅示意挂载位置，不在本期修改）
export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>        {/* 新增：与 ThemeProvider 同级，包裹在 ToastContainer 之外即可 */}
          <ToastContainer>
            <AppContent />
            <ShortcutHelp />
          </ToastContainer>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
```

> `LanguageProvider` 必须包裹所有调用 `useTranslation()` 的组件（Navbar / 各 Page / ShortcutHelp / TemplateCard / FavoriteButton / ToastContainer）。放在 `ToastContainer` 外层可确保 toast 消息也能使用 `t`（toast 的 message 由调用方传入已翻译字符串即可，ToastContainer 本身无需消费 context）。

### 3.4 插值约定

- 占位符统一用 `{varName}`，如 `'{count} 颗'`、`'搜索「{query}」'`。
- 调用：`t('home.recent.beads', { count: 120 })` → `'120 颗'` / `'120 beads'`。
- 不引入复数规则；如未来需要，可在 `translate` 中按 `lang` 分支处理。

---

## 4. 翻译键命名规范

### 4.1 总体规则

- **扁平点分键**：`<域>.<子域>.<语义>`，如 `home.hero.title`、`nav.search.placeholder`。
- 全小写驼峰分组，单词用 `.` 分隔，不使用空格 / 连字符。
- 键名表达"位置 + 语义"，而非"中文原文"，便于复用与扩展。
- 同一文案在多处复用时，归入 `common.*`；仅在单页使用的归入该页命名空间。

### 4.2 命名空间划分

| 前缀 | 含义 | 示例 |
|------|------|------|
| `common.*` | 跨页复用词（返回、取消、颗、复制等） | `common.back`、`common.beadsUnit` |
| `difficulty.*` | 难度枚举 | `difficulty.easy` |
| `app.*` | 应用级（应用名、document.title、404、全局 toast） | `app.title.detail` |
| `nav.*` | 顶部导航栏 | `nav.search.placeholder` |
| `home.*` | 首页 | `home.hero.title` |
| `detail.*` | 详情页 | `detail.palette.title` |
| `favorites.*` | 收藏页 | `favorites.modal.title` |
| `colorRef.*` | 色卡参考页 | `colorRef.intro` |
| `category.*` | 分类（由 `categories.ts` 的 `id` 派生） | `category.anime.name` |
| `shortcut.*` | 快捷键帮助面板 | `shortcut.title` |
| `toast.*` | Toast 容器本身的 aria | `toast.region.ariaLabel` |

### 4.3 aria-label / title 命名

- 可见文本与 aria 文案分别建键，避免误用可见文本当 aria。
- aria-label 键加 `.ariaLabel` 后缀：`detail.zoom.out`（可见） vs 不需要；`nav.colorRef.ariaLabel`。
- `title`（原生 tooltip）键加 `.title` 后缀：`detail.palette.copyAll.title`。

### 4.4 分类键派生规则

`categories.ts` 中每个分类有 `id`（如 `anime`）。翻译键直接由 `id` 派生：
- 名称：`category.<id>.name`
- 描述：`category.<id>.desc`

组件中用 `t(\`category.${cat.id}.name\`)` 解析，**无需修改 `categories.ts` 的数据结构**（详见第 11 节）。

---

## 5. 中英文翻译对照表

> 英文为自然本地化表达，非机器直译。
> 约定：`拼豆` → `Perler Bead`（语境）/ `fuse bead`（泛指）；`色卡` → `Color palette`（详情页配色）/ `Color reference`（色卡参考页）。

### 5.1 common（通用）

| 键 | 中文 | English |
|----|------|---------|
| `common.back` | 返回 | Back |
| `common.cancel` | 取消 | Cancel |
| `common.close` | 关闭 | Close |
| `common.clear` | 清空 | Clear |
| `common.clearFilter` | 清除筛选 | Clear filters |
| `common.clearFilters` | 清除筛选条件 | Clear all filters |
| `common.sort` | 排序 | Sort |
| `common.size` | 尺寸 | Size |
| `common.name` | 名称 | Name |
| `common.color` | 颜色 | Color |
| `common.colors` | 颜色 | Colors |
| `common.copy` | 复制 | Copy |
| `common.copied` | 已复制 | Copied |
| `common.copyFailed` | 复制失败 | Copy failed |
| `common.total` | 合计 | Total |
| `common.beadsUnit` | {count} 颗 | {count} beads |
| `common.beadsUnitShort` | {count}颗 | {count} beads |
| `common.items` | {count} 个 | {count} items |
| `common.favorite.add` | 加入收藏 | Add to favorites |
| `common.favorite.remove` | 取消收藏 | Remove from favorites |

### 5.2 difficulty（难度）

| 键 | 中文 | English |
|----|------|---------|
| `difficulty.all` | 全部 | All |
| `difficulty.easy` | 简单 | Easy |
| `difficulty.medium` | 中等 | Medium |
| `difficulty.hard` | 困难 | Hard |

### 5.3 app（应用名、标题、404、全局 toast）

| 键 | 中文 | English |
|----|------|---------|
| `app.name` | 拼豆收集 | Perler Bead Collection |
| `app.title.default` | 拼豆收集 - Perler Bead Templates | Perler Bead Collection - Templates |
| `app.title.detail` | {name} - 拼豆收集 | {name} - Perler Bead Collection |
| `app.title.favorites` | 我的收藏 - 拼豆收集 | My Favorites - Perler Bead Collection |
| `app.title.colorRef` | 色卡参考 - 拼豆收集 | Color Reference - Perler Bead Collection |
| `app.title.notFound` | 模板不存在 - 拼豆收集 | Template Not Found - Perler Bead Collection |
| `app.404.title` | 页面不存在 | Page Not Found |
| `app.404.desc` | 找不到该路径，可能链接已失效 | This path could not be found. The link may be broken. |
| `app.404.backHome` | 返回首页 | Back to home |
| `app.toast.favorited` | 已加入收藏 | Added to favorites |
| `app.toast.unfavorited` | 已取消收藏 | Removed from favorites |
| `app.toast.favoritesCleared` | 已清空收藏 | Favorites cleared |
| `app.toast.updateAvailable` | 已发布新版本，刷新以更新 | A new version is available. Refresh to update. |

### 5.4 nav（导航栏）

| 键 | 中文 | English |
|----|------|---------|
| `nav.brand` | 拼豆收集 | Perler Beads |
| `nav.search.placeholder` | 搜索模板... | Search templates... |
| `nav.search.ariaLabel` | 搜索模板 | Search templates |
| `nav.search.clear` | 清除搜索 | Clear search |
| `nav.colorRef.ariaLabel` | 色卡参考 | Color reference |
| `nav.colorRef.title` | 色卡参考 | Color reference |
| `nav.favorites.ariaLabel` | 收藏 ({count}) | Favorites ({count}) |
| `nav.theme.toggleToLight` | 切换明亮主题 | Switch to light theme |
| `nav.theme.toggleToDark` | 切换深色主题 | Switch to dark theme |
| `nav.lang.ariaLabel` | 切换语言 | Switch language |
| `nav.lang.title` | 切换语言 | Switch language |
| `nav.lang.labelToEn` | EN | EN |
| `nav.lang.labelToZh` | 中 | 中文 |

### 5.5 home（首页）

| 键 | 中文 | English |
|----|------|---------|
| `home.hero.title` | 拼豆模板收集 | Perler Bead Template Collection |
| `home.hero.subtitle` | 收录动漫、游戏、明星等像素图案 · 内置三品牌色卡参考 · 让拼豆制作更简单 | Anime, game & celebrity pixel art · built-in color reference for three brands · making fuse bead crafting easier |
| `home.hero.stat.templates` | 模板 | Templates |
| `home.hero.stat.categories` | 分类 | Categories |
| `home.hero.stat.totalBeads` | 总颗数 | Total beads |
| `home.hero.stat.colors` | 颜色 | Colors |
| `home.hero.feature.search` | 即时搜索 | Instant search |
| `home.hero.feature.colorRef` | 色卡参考 | Color reference |
| `home.hero.feature.favorites` | 一键收藏 | One-tap favorites |
| `home.hero.feature.materialList` | 用量清单 | Material list |
| `home.hero.feature.theme` | 明暗主题 | Light / dark theme |
| `home.hero.feature.shortcuts` | 快捷键 | Keyboard shortcuts |
| `home.recent.title` | 最近浏览 | Recently viewed |
| `home.recent.beads` | {count}颗 | {count} beads |
| `home.toolbar.searchFor` | 搜索「{query}」 | Search "{query}" |
| `home.toolbar.resultCount` |  · {count} 个 |  · {count} items |
| `home.toolbar.ariaLabel.difficulty` | 难度筛选 | Difficulty filter |
| `home.toolbar.ariaLabel.colorFilter` | 按颜色筛选 | Filter by color |
| `home.toolbar.ariaLabel.clearColorFilter` | 清除颜色筛选 | Clear color filter |
| `home.toolbar.ariaLabel.selectColor` | 选择颜色 | Select color |
| `home.toolbar.ariaLabel.gridSize` | 网格尺寸筛选 | Grid size filter |
| `home.toolbar.ariaLabel.sort` | 排序方式 | Sort by |
| `home.toolbar.color.byColor` | 按颜色 | By color |
| `home.toolbar.color.selected` | 颜色 | Color |
| `home.toolbar.color.dropdownTitle` | 选择颜色筛选 | Select a color to filter |
| `home.toolbar.gridSize.all` | 全部 | All |
| `home.toolbar.gridSize.small` | 小型 (≤16) | Small (≤16) |
| `home.toolbar.gridSize.medium` | 中型 (17-29) | Medium (17-29) |
| `home.toolbar.gridSize.large` | 大型 (≥30) | Large (≥30) |
| `home.sort.default` | 默认 | Default |
| `home.sort.name` | 名称 | Name |
| `home.sort.beadsAsc` | 颗数 ↑ | Bead count ↑ |
| `home.sort.beadsDesc` | 颗数 ↓ | Bead count ↓ |
| `home.sort.difficulty` | 难度 | Difficulty |
| `home.empty.title` | 没有找到匹配的模板 | No matching templates found |
| `home.empty.desc` | 试试其他关键词或分类吧 | Try a different keyword or category |

### 5.6 detail（详情页）

| 键 | 中文 | English |
|----|------|---------|
| `detail.empty.title` | 模板不存在 | Template not found |
| `detail.empty.desc` | 该模板可能已被移除 | This template may have been removed |
| `detail.empty.backHome` | 返回首页 | Back to home |
| `detail.back` | 返回 | Back |
| `detail.share.ariaLabel` | 分享链接 | Share link |
| `detail.share.title` | 分享链接 | Share link |
| `detail.zoom.out` | 缩小 | Zoom out |
| `detail.zoom.reset` | 重置缩放 | Reset zoom |
| `detail.zoom.in` | 放大 | Zoom in |
| `detail.zoom.gridLines` | 切换网格线 | Toggle grid lines |
| `detail.zoom.gridLinesTitle` | 网格线 | Grid lines |
| `detail.stat.totalBeads` | 总颗数 | Total beads |
| `detail.stat.colors` | 颜色数 | Colors |
| `detail.stat.gridSize` | 网格尺寸 | Grid size |
| `detail.palette.title` | 色卡（点击复制色号） | Color palette (click to copy code) |
| `detail.palette.sort.ariaLabel` | 色卡排序方式 | Sort palette by |
| `detail.palette.sort.count` | 数量 ↓ | Count ↓ |
| `detail.palette.sort.name` | 名称 | Name |
| `detail.palette.sort.hex` | 色号 | Code |
| `detail.palette.copyAll` | 复制全部 | Copy all |
| `detail.palette.copied` | 已复制 | Copied |
| `detail.palette.copyAll.title` | 复制全部色卡 | Copy all colors |
| `detail.palette.printList` | 用量清单 | Material list |
| `detail.palette.printList.title` | 打印用量清单 | Print material list |
| `detail.palette.printList.ariaLabel` | 打印用量清单 | Print material list |
| `detail.palette.export` | 导出图片 | Export image |
| `detail.palette.export.title` | 导出 PNG 图片 | Export PNG image |
| `detail.palette.export.ariaLabel` | 导出 PNG 图片 | Export PNG image |
| `detail.swatch.copyTitle` | 复制 {hex} | Copy {hex} |
| `detail.swatch.ariaLabel` | 复制色号 {hex} {name} {count}颗 | Copy color code {hex} {name} {count} beads |
| `detail.print.meta` | 总颗数：{beadCount} · 颜色数：{colors} · 网格：{cols}×{rows} · 难度：{difficulty} · 来源：{source} | Total beads: {beadCount} · Colors: {colors} · Grid: {cols}×{rows} · Difficulty: {difficulty} · Source: {source} |
| `detail.print.col.swatch` | 色块 | Swatch |
| `detail.print.col.hex` | 色号 | Code |
| `detail.print.col.name` | 名称 | Name |
| `detail.print.col.count` | 数量 | Count |
| `detail.print.col.ratio` | 占比 | Ratio |
| `detail.print.total` | 合计 | Total |
| `detail.print.totalBeads` | {beadCount} 颗 | {beadCount} beads |
| `detail.print.colors` | {count} 种颜色 | {count} colors |
| `detail.print.cell.beads` | {count} 颗 | {count} beads |
| `detail.source.label` | 来源： | Source:  |
| `detail.pager.ariaLabel` | 模板切换 | Template navigation |
| `detail.pager.prev` | 上一个 | Previous |
| `detail.pager.next` | 下一个 | Next |
| `detail.related.title` | 相似模板 | Similar templates |
| `detail.related.ariaLabel` | 相似模板推荐 | Similar templates |
| `detail.related.beads` | {count} 颗 | {count} beads |
| `detail.shortcuts.switchTemplate` | 切换模板 | Switch template |
| `detail.shortcuts.backHome` | 返回首页 | Back to home |
| `detail.backToTop` | 返回顶部 | Back to top |
| `detail.toast.linkCopied` | 链接已复制 | Link copied |
| `detail.toast.hexCopied` | 已复制 {hex} | Copied {hex} |
| `detail.toast.copyFailed` | 复制失败 | Copy failed |
| `detail.toast.colorsCopied` | 已复制 {count} 种颜色 | Copied {count} colors |
| `detail.toast.preparingPrint` | 正在准备打印清单 | Preparing material list… |
| `detail.toast.pngExported` | 已导出 PNG 图片 | PNG image exported |
| `detail.toast.exportFailed` | 导出失败 | Export failed |

### 5.7 favorites（收藏页）

| 键 | 中文 | English |
|----|------|---------|
| `favorites.back` | 返回 | Back |
| `favorites.title` | 我的收藏 ({count}) | My Favorites ({count}) |
| `favorites.sort.ariaLabel` | 收藏排序方式 | Sort favorites by |
| `favorites.sort.recent` | 收藏时间 | Recently favorited |
| `favorites.sort.name` | 名称 | Name |
| `favorites.sort.beads` | 颗数 | Bead count |
| `favorites.clear.button` | 清空 | Clear |
| `favorites.clear.ariaLabel` | 清空收藏 | Clear favorites |
| `favorites.clear.title` | 清空收藏 | Clear favorites |
| `favorites.empty.title` | 还没有收藏 | No favorites yet |
| `favorites.empty.desc` | 去首页发现你喜欢的拼豆模板吧！ | Discover perler bead templates you love on the home page! |
| `favorites.empty.action` | 去首页逛逛 | Browse home page |
| `favorites.modal.title` | 确认清空收藏？ | Clear all favorites? |
| `favorites.modal.desc` | 将移除全部 {count} 个收藏，此操作不可撤销。 | This will remove all {count} favorites. This action cannot be undone. |
| `favorites.modal.cancel` | 取消 | Cancel |
| `favorites.modal.confirm` | 清空 | Clear |

### 5.8 colorRef（色卡参考页）

| 键 | 中文 | English |
|----|------|---------|
| `colorRef.back` | 返回 | Back |
| `colorRef.title` | 拼豆色卡参考 | Perler Bead Color Reference |
| `colorRef.intro` | 收录 Perler、Artkal、Hama 三大主流拼豆品牌的常用色号对照，共 {count} 种颜色。 | A color reference covering common color codes across the three major fuse bead brands — Perler, Artkal, and Hama — with {count} colors in total. |
| `colorRef.hint` | 点击色块复制色号，支持按名称、色号、品牌编号搜索。 | Click a swatch to copy its color code. Search by name, hex code, or brand number. |
| `colorRef.search.placeholder` | 搜索颜色名称、色号或品牌编号... | Search by name, hex code, or brand number… |
| `colorRef.search.ariaLabel` | 搜索颜色 | Search colors |
| `colorRef.search.clear` | 清除搜索 | Clear search |
| `colorRef.brandFilter.ariaLabel` | 品牌筛选 | Brand filter |
| `colorRef.reset` | 清除筛选 | Clear filters |
| `colorRef.count.search` | 搜索「{query}」· {count} 种 | Search "{query}" · {count} colors |
| `colorRef.count.total` | 共 {count} 种颜色 | {count} colors in total |
| `colorRef.swatch.copyTitle` | 复制 {hex} | Copy {hex} |
| `colorRef.swatch.ariaLabel` | 复制色号 {hex} {name} | Copy color code {hex} {name} |
| `colorRef.empty.title` | 没有找到匹配的颜色 | No matching colors found |
| `colorRef.empty.desc` | 试试其他关键词吧 | Try a different keyword |
| `colorRef.legend.title` | 品牌说明 | Brand notes |
| `colorRef.legend.perler` | Perler Beads（美国品牌，最常见） | Perler Beads (US brand, most common) |
| `colorRef.legend.artkal` | Artkal（国产优质品牌，色号丰富） | Artkal (Chinese brand, wide color range) |
| `colorRef.legend.hama` | Hama Beads（丹麦品牌，欧洲主流） | Hama Beads (Danish brand, popular in Europe) |
| `colorRef.note` | 注：色号为常见对照参考，不同批次可能有细微色差。建议购买前对照实物色卡确认。 | Note: Color codes are for general reference only; slight variations may occur between batches. Please verify against a physical color card before purchasing. |
| `colorRef.toast.hexCopied` | 已复制 {hex} | Copied {hex} |
| `colorRef.toast.copyFailed` | 复制失败 | Copy failed |

### 5.9 category（分类，由 `categories.ts` 的 `id` 派生）

| 键 | 中文 | English |
|----|------|---------|
| `category.all.name` | 全部 | All |
| `category.all.desc` | 全部模板 | All templates |
| `category.anime.name` | 动漫 | Anime |
| `category.anime.desc` | 日本动漫角色与场景 | Japanese anime characters & scenes |
| `category.pokemon.name` | 游戏 | Games |
| `category.pokemon.desc` | 宝可梦、Minecraft 等游戏角色 | Pokémon, Minecraft and other game characters |
| `category.celebrity.name` | 明星 | Celebrities |
| `category.celebrity.desc` | 热门明星、歌手、演员像素头像 | Pixel portraits of popular stars, singers & actors |
| `category.food.name` | 食物 | Food |
| `category.food.desc` | 水果、甜品、饮品 | Fruits, desserts & drinks |
| `category.animals.name` | 动物 | Animals |
| `category.animals.desc` | 萌宠与野生动物 | Pets & wild animals |
| `category.holiday.name` | 节日 | Holidays |
| `category.holiday.desc` | 春节、圣诞、万圣节等 | Lunar New Year, Christmas, Halloween and more |
| `category.kawaii.name` | Kawaii | Kawaii |
| `category.kawaii.desc` | 可爱日系风格 | Cute Japanese-style designs |
| `category.pixel3d.name` | 3D立体 | 3D |
| `category.pixel3d.desc` | 立体方块作品 | 3D block-style works |
| `category.emoji.name` | 表情包 | Emoji |
| `category.emoji.desc` | 像素头像与 emoji 表情 | Pixel avatars & emoji |

### 5.10 shortcut（快捷键面板）

| 键 | 中文 | English |
|----|------|---------|
| `shortcut.title` | 键盘快捷键 | Keyboard shortcuts |
| `shortcut.close` | 关闭 | Close |
| `shortcut.desc.focusSearch` | 聚焦搜索框 | Focus search box |
| `shortcut.desc.backOrClose` | 返回首页 / 关闭弹窗 | Back to home / close dialog |
| `shortcut.desc.prevNext` | 上一个 / 下一个模板（详情页） | Previous / next template (detail page) |
| `shortcut.desc.toggleHelp` | 显示 / 隐藏快捷键帮助 | Show / hide shortcut help |

### 5.11 toast（容器本身）

| 键 | 中文 | English |
|----|------|---------|
| `toast.region.ariaLabel` | 通知 | Notifications |
| `toast.close` | 关闭通知 | Close notification |

> 合计约 **200+ 个键**，覆盖所有页面全部可见文案与 aria 文案。

---

## 6. 持久化方案

| 项 | 设计 |
|----|------|
| localStorage key | `beads-lang`（与 `beads-theme` 命名风格一致） |
| 合法值 | `'zh'` \| `'en'` |
| 首次访问 | 无存储值时，根据 `navigator.language` 检测：以 `en` 开头则默认 `en`，否则 `zh`（与 ThemeContext "跟随系统" 思路一致） |
| 写入时机 | `setLang` / `toggleLang` 调用时立即写入 |
| 跨标签页同步 | 监听 `window` 的 `storage` 事件，`e.key === 'beads-lang'` 时同步状态（与 ThemeContext 完全相同） |
| `<html lang>` 同步 | Provider 挂载与 `lang` 变化时设置 `document.documentElement.lang`（`en` / `zh-CN`），利于无障碍与 SEO |
| 异常容错 | `localStorage` 访问包裹 `try/catch`（隐私模式等场景），失败回退到默认值，不阻断渲染 |

> 不需要写入 URL 或 cookie；纯前端 SPA，localStorage 已足够。

---

## 7. 语言切换按钮设计

### 7.1 位置

放在 `Navbar` 的 `navbar__actions` 容器内，作为**最后一个按钮**（位于主题切换按钮之后）。理由：
- 语言与主题同属"应用偏好"，分组放置符合心智。
- 放在最右侧不抢占搜索区视觉焦点。
- 与现有 `navbar__action-btn` 样式复用，视觉一致。

顺序建议：`色卡参考` → `收藏` → `主题` → `语言`。

### 7.2 交互形态（仅 2 种语言，推荐"切换"而非下拉）

- 单击在 `zh` / `en` 间切换。
- 按钮显示**目标语言**标签：当前为 `zh` 时显示 `EN`；当前为 `en` 时显示 `中`（即点击后将切换到的语言），降低误触。
- `aria-label` = `t('nav.lang.ariaLabel')`，`title` = `t('nav.lang.title')`。
- 图标可选：使用 `lucide-react` 的 `Languages` 图标置于文字前；为保持导航栏图标按钮风格统一，也可纯文字。

```tsx
// Navbar.tsx 改动示意（不在本期执行）
const { lang, toggleLang, t } = useTranslation();
// ...
<button
  type="button"
  className="navbar__action-btn navbar__lang-btn"
  onClick={toggleLang}
  aria-label={t('nav.lang.ariaLabel')}
  title={t('nav.lang.title')}
>
  {lang === 'zh' ? t('nav.lang.labelToEn') : t('nav.lang.labelToZh')}
</button>
```

### 7.3 样式建议（最小改动）

- 复用 `.navbar__action-btn`，可额外加 `.navbar__lang-btn` 微调字号（文字按钮通常比纯图标略小）。
- 建议标签用 `font-weight: 600; font-size: 13px;` 以与 20px 图标视觉对齐。
- 若未来语言增多（>2），再升级为带 `Languages` 图标的小下拉菜单；当前 2 语言无需提前抽象。

---

## 8. index.html 与 document.title 处理

### 8.1 `<html lang>` 与首屏

- `index.html` 中 `<html lang="zh-CN">` 为静态默认值（首屏 SEO 友好的保守选择）。
- `LanguageProvider` 挂载后会立即根据存储 / 检测结果覆写 `document.documentElement.lang` 为 `en` 或 `zh-CN`，运行时始终正确。
- 可选增强：在 `index.html` 现有内联脚本（已用于主题防 FOUC）中追加一段读取 `localStorage.getItem('beads-lang')` 并设置 `document.documentElement.lang` 的逻辑，避免 SSR 首帧语言属性短暂不一致。**非必须**，仅对极致首屏一致性有意义。

### 8.2 document.title

`App.tsx` 中已有动态 `document.title` 逻辑，全部改用 `t()`：

```tsx
// 改动示意
useEffect(() => {
  if (currentTemplate) {
    document.title = t('app.title.detail', { name: currentTemplate.name });
  } else if (routeParts[0] === 'favorites') {
    document.title = t('app.title.favorites');
  } else if (routeParts[0] === 'colors') {
    document.title = t('app.title.colorRef');
  } else if (routeParts[0] === 'template') {
    document.title = t('app.title.notFound');
  } else {
    document.title = t('app.title.default');
  }
}, [currentTemplate, hash, t]);  // 注意：t 随 lang 变化，需进依赖数组，使切换语言后 title 同步刷新
```

> 关键点：把 `t` 加入 `useEffect` 依赖，确保切换语言后浏览器标签页标题也立即更新。

### 8.3 meta description / keywords / og:*

- 这些是静态 SEO 元信息，SPA 客户端渲染下搜索引擎抓取受限，**本期保持中文不动**。
- 如需多语言 SEO，应配合 SSR / 预渲染，超出纯前端范畴，不在本期处理。

---

## 9. 内容数据（模板 / 颜色名）的范畴说明

| 数据源 | 内容 | 本期处理 |
|--------|------|----------|
| `data/*.json` | 模板 `name` / `description` / `tags` | ❌ 不翻译。这些是作品内容，数量大且需作者本地化。 |
| `data/*.json` 中 `colors[].name` | 单模板配色名（如"明黄"） | ❌ 不翻译，随模板内容走。 |
| `beadColors.ts` 中 `ColorGroup.name` | 色系分组名（如"白色系"） | ⚠️ 可选增强（见下）。 |
| `beadColors.ts` 中 `BeadColor.name` | 通用颜色名（如"纯白"） | ⚠️ 可选增强。 |
| `categories.ts` 中 `name` / `description` | 分类导航文案 | ✅ 翻译（由 `id` 派生键）。 |

**可选增强（不在本期，仅供后续规划）**：

1. **分类**：本期已覆盖，无需改 `categories.ts` 结构。
2. **通用颜色名 / 色系分组**：若要翻译 `beadColors.ts`，建议为 `BeadColor` / `ColorGroup` 增加 `nameEn` 字段，渲染时按 `lang` 选择 `name` 或 `nameEn`；或在 `ColorReferencePage` 维护一份 `{hex: enName}` 映射。工作量中等，建议作为独立 PR。
3. **模板内容**：为 `BeadTemplate` 增加 `nameEn?` / `descEn?`，按 `lang` 选择。需逐条人工翻译，工作量大，建议按分类逐步推进。

---

## 10. 实施步骤清单（按文件）

> 顺序建议：先建基础设施（1-3），再从叶子组件向上替换文案（4-12），最后接通 App 层标题与挂载（13-14）。每步可独立提交、独立验证。

### 阶段 A：基础设施

1. **新增 `src/i18n/types.ts`**
   - 定义 `Language = 'zh' | 'en'`、`TranslationParams = Record<string, string | number>`。

2. **新增 `src/i18n/translations.ts`**
   - 按第 5 节对照表填入 `zh` / `en` 两个 `Record<string, string>`。
   - 建议按命名空间用注释分段，便于维护。

3. **新增 `src/context/LanguageContext.tsx`**
   - 按第 3.1 节实现 `LanguageProvider` / `useTranslation` / `t` / 持久化 / 跨标签页同步 / `<html lang>` 同步。

### 阶段 B：叶子组件（无下游依赖，先改）

4. **`src/components/FavoriteButton.tsx`**
   - `aria-label={favorite ? t('common.favorite.remove') : t('common.favorite.add')}`。

5. **`src/components/ToastContainer.tsx`**
   - region `aria-label` → `t('toast.region.ariaLabel')`；关闭按钮 `aria-label` → `t('toast.close')`。
   - 注意：`showToast(message)` 的 `message` 由调用方传入已翻译字符串，容器本身不改 `showToast` 签名。

6. **`src/components/TemplateCard.tsx`**
   - `difficultyStyles` 的 `label` 改为通过 `t('difficulty.easy'|'medium'|'hard')` 解析（可将 `difficultyStyles` 改为只保留 `bg`，label 运行时取）。
   - `{beadCount} 颗` → `t('common.beadsUnitShort', { count: beadCount })`。

7. **`src/components/ShortcutHelp.tsx`**
   - `shortcuts` 数组的 `desc` 改为键引用，渲染时 `t(s.descKey)`；或直接在渲染处用 `t()`。
   - 标题 `键盘快捷键` → `t('shortcut.title')`；关闭 `aria-label` → `t('shortcut.close')`。

### 阶段 C：导航与各页面

8. **`src/components/Navbar.tsx`**
   - 引入 `useTranslation`。
   - 替换：品牌名、搜索占位符、各 `aria-label`、`title`、主题切换 `aria-label`（用 `nav.theme.toggleToLight/Dark`）。
   - 新增语言切换按钮（见第 7 节）。
   - 收藏 `aria-label` 用 `t('nav.favorites.ariaLabel', { count: favoritesCount })`。

9. **`src/components/CategoryFilter.tsx`**
   - `cat.name` → `t(\`category.${cat.id}.name\`)`；`title={cat.description}` → `title={t(\`category.${cat.id}.desc\`)}`。
   - 此组件不改 `categories.ts`，仅改渲染取值方式。

10. **`src/pages/HomePage.tsx`**
    - `sortOptions` / `difficultyFilters` 的 `label` 改为运行时 `t()`（保留 `value`，`label` 用键或直接在 JSX 用 `t('home.sort.default')` 等）。
    - hero 区：title、subtitle、4 个 stat label、6 个 feature。
    - 最近浏览：`最近浏览` 标题、`{count}颗`。
    - 工具栏：`searchFor` / `resultCount` / 各 aria-label / `按颜色` / `颜色` / 下拉标题 / 网格尺寸 4 项 / `尺寸` / `排序` 标签。
    - 空状态：title、desc、`清除筛选条件` 按钮。
    - `activeCategoryName` 回退 `'全部'` → `t('category.all.name')`。

11. **`src/pages/DetailPage.tsx`**
    - `difficultyStyles` label 运行时取 `t('difficulty.*')`（与 TemplateCard 一致）。
    - 空状态、返回、分享 aria/title、缩放 4 个 aria + 网格线 title、3 个 stat label、色卡标题与排序（label + 3 选项 + aria）、复制全部 / 用量清单 / 导出图片（可见文本 + title + aria）、swatch title 与 aria、打印清单 meta 与表头 5 列 + tfoot 合计/颗/种颜色 + 单元格颗、来源 label、pager aria + 上一个/下一个、相似模板标题/aria/颗、底部快捷键提示、返回顶部 aria。
    - 7 条 toast 消息全部用 `t()`（注意 `已复制 {hex}`、`已复制 {count} 种颜色` 带插值）。
    - `handleCopyAllColors` 中拼接的 `${c.count}颗` → 用 `t('common.beadsUnitShort', {count})` 拼接。

12. **`src/pages/FavoritesPage.tsx`**
    - `sortOptions` 3 项 label、返回、标题（带 count 插值）、排序 label/aria、清空按钮文本/aria/title、空状态 title/desc/action、模态框 title/desc（带 count 插值）/取消/清空。

13. **`src/pages/ColorReferencePage.tsx`**
    - `brandOptions` 的 `label`（Perler/Artkal/Hama）为品牌名，**保留原文不翻译**。
    - 返回、标题、intro（带 count 插值）、hint、搜索 placeholder/aria/clear、品牌筛选 aria、清除筛选、count.search / count.total、swatch title/aria、空状态、品牌说明标题与 3 条说明、note、2 条 toast。

### 阶段 D：App 层接通

14. **`src/App.tsx`**
    - 在 `ThemeProvider` 内（或外，二者同级即可）包裹 `LanguageProvider`。
    - `toggleFavorite` 内 toast：`已加入收藏` / `已取消收藏` → `t('app.toast.favorited'|'unfavorited')`。
    - `handleClearFavoritesWithToast`：`已清空收藏` → `t('app.toast.favoritesCleared')`。
    - SW 更新 toast：`已发布新版本，刷新以更新` → `t('app.toast.updateAvailable')`。
    - 404 空状态：title/desc/按钮。
    - `document.title` 的 5 个分支改用 `t()`（见第 8.2 节，`t` 进依赖数组）。

15. **`src/categories.ts`（可选清理）**
    - 本期**无需修改结构**：`name` / `description` 字段在组件中不再被直接渲染（改用 `t()` 解析）。
    - 可选：移除已不再使用的 `name` / `description` 中文字段以减少冗余；或保留作为默认回退。建议先保留，待全量验证无误后再清理。

### 阶段 E：验证

16. **手工验证**
    - 默认语言、切换、刷新保持、跨标签页同步。
    - 各页面在 `zh` / `en` 下文案完整无遗漏（重点查 aria-label、placeholder、title 属性、打印清单表头、document.title）。
    - 切换语言时，正在显示的页面文案与浏览器标题即时更新。
    - 颜色筛选下拉、模态框、快捷键面板等动态出现的内容语言正确。

17. **回归**
    - 收藏 / 取消收藏 toast、复制色号 toast、导出 PNG toast 文案正确。
    - 打印用量清单（`@media print`）表头与合计行语言正确。
    - 搜索高亮、排序、筛选功能不受影响。

---

## 11. 关于 `categories.ts` 的翻译策略（细化）

`categories.ts` 当前结构：

```ts
{ id: 'anime', name: '动漫', icon: 'Sparkles', description: '日本动漫角色与场景', sortOrder: 1 }
```

**推荐做法（零结构改动）**：组件渲染处改用派生键：
- `cat.name` → `t(\`category.${cat.id}.name\`)`
- `cat.description` → `t(\`category.${cat.id}.desc\`)`

涉及渲染点：
- `CategoryFilter.tsx`：分类按钮文本与 `title`。
- `HomePage.tsx`：`categoryNameMap`（用于卡片分类标签）与 `activeCategoryName`。

优点：`categories.ts` 完全不动，`id` 即键，新增分类只需在字典补两行。

**备选做法（显式键字段）**：为 `Category` 增加 `nameKey` / `descKey`，在 `categories.ts` 写明键名。更显式但更冗余，本项目 `id` 已稳定，不推荐。

---

## 12. 风险与注意事项

1. **`t` 进依赖数组**：所有 `useEffect` / `useMemo` / `useCallback` 中用到 `t` 的地方需把 `t` 加入依赖，否则切换语言后闭包内仍是旧 `t`（旧语言）。典型场景：`App.tsx` 的 `document.title` effect、`DetailPage` 的 toast 回调（toast 在 `useCallback` 中，闭包捕获 `t`，需进依赖）。
2. **`useCallback` 闭包刷新**：如 `toggleFavorite` 依赖 `[isFavorite, toggleFav, showToast]`，加入 `t` 后依赖变化会更频繁重建回调——可接受，因 `t` 仅在语言切换时变化。
3. **插值键名一致性**：`{count}` / `{hex}` / `{name}` / `{query}` 等占位符在 zh / en 两种语言中必须同名，否则翻译失败回退到键本身。字典维护时需成对检查。
4. **未命中键的回退**：`translate` 设计为 `当前语言 → zh → key`。开发期可在控制台对"回退到 key"的情况打 warn（仅 dev），便于发现遗漏键；生产环境静默。
5. **打印清单**：`@media print` 区域的表头、合计行、meta 行均有文案，切换语言后打印输出也应正确——需确保打印触发时 `t` 已是最新语言（`handlePrintList` 中 `t` 来自闭包，依赖正确即可）。
6. **`navigator.language` 检测**：部分浏览器返回形如 `zh-CN`、`en-US`、`zh-Hans`，检测时用 `toLowerCase().startsWith('en')` 判断，其余一律 `zh`，避免误判。
7. **`index.html` 静态文案**：title 与 meta 仍是中文，对纯客户端 SPA 影响有限；若需首屏即英文，可加内联脚本（第 8.1 节），但非必须。
8. **品牌名不翻译**：Perler / Artkal / Hama 为品牌专有名词，在 `colorRef` 的 `brandOptions` 与 legend 中保留原文（legend 的括号说明仍翻译）。

---

## 13. 附录：命名空间键索引（快速检索）

```
common.*         通用词（back/cancel/close/copy/copied/beadsUnit/items/favorite.add/remove ...）
difficulty.*     all/easy/medium/hard
app.*            name/title.*/404.*/toast.*
nav.*            brand/search.*/colorRef.*/favorites.ariaLabel/theme.toggleTo*/lang.*
home.*           hero.*/recent.*/toolbar.*/sort.*/empty.*
detail.*         empty.*/back/share.*/zoom.*/stat.*/palette.*/swatch.*/print.*/source.*/pager.*/related.*/shortcuts.*/backToTop/toast.*
favorites.*      back/title/sort.*/clear.*/empty.*/modal.*
colorRef.*       back/title/intro/hint/search.*/brandFilter.ariaLabel/reset/count.*/swatch.*/empty.*/legend.*/note/toast.*
category.*       <id>.name / <id>.desc   （all/anime/pokemon/celebrity/food/animals/holiday/kawaii/pixel3d/emoji）
shortcut.*       title/close/desc.*
toast.*          region.ariaLabel/close
```

---

*文档完。实施时请严格按"实施步骤清单"逐文件落地，每阶段独立验证。*
