<div align="center">

# 🔴 拼豆收集 · Perler Bead Templates

**一个专注于拼豆（Perler Bead / 熨斗豆）图案模板的收集与浏览应用**

收录动漫、游戏、明星、食物、动物、节日等多种分类的像素图案，提供色卡、网格预览、收藏与快捷搜索，并内置拼豆色卡参考库（Perler / Artkal / Hama 三大品牌色号对照），方便拼豆爱好者对照制作与选购。

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

</div>

---

## ✨ 功能特性

### 🔍 浏览与搜索

| 功能 | 说明 |
|:----:|------|
| 🏷️ 分类筛选 | 10 大分类（动漫、游戏、明星、食物、动物、节日、Kawaii、3D 立体、表情包），带分类图标与数量计数 |
| 🎯 难度筛选 | 简单 / 中等 / 困难 三级过滤 |
| 📐 网格尺寸 | 小型 (≤16) / 中型 (17-29) / 大型 (≥30) 按网格最大边长过滤 |
| 🎨 按颜色筛选 | 下拉色板选择任意颜色，筛选包含该色的模板 |
| ↕️ 多维度排序 | 默认、名称、颗数升降序、难度 |
| ⚡ 即时搜索 | 300ms 防抖搜索，匹配名称、标签、描述，命中关键词全局高亮 |
| 🕒 最近浏览 | 首页横滑展示最近查看的模板，最多 6 个 |
| 💾 状态持久化 | 筛选/排序/难度/尺寸/颜色状态提升到 App 层，导航返回不丢失 |

### 📋 详情页

- 🔍 **像素网格**：支持 0.5x ~ 3x 缩放、网格线切换
- 🎨 **色卡面板**：点击复制单个色号，一键复制全部色卡，支持按数量/名称/色号排序
- 📊 **颜色占比**：每色显示颗数与占比条形图，直观了解颜色分布
- 📈 **统计信息**：总颗数、颜色数、网格尺寸
- ⬅️➡️ **上下页导航**：基于全量列表的前后切换
- 🔗 **分享链接**：优先调用系统分享面板，回退到剪贴板复制
- 🖨️ **用量清单导出**：一键打印用量清单（色块/色号/名称/数量/占比/合计），打印时自动隐藏交互元素
- 🖼️ **PNG 导出**：一键导出像素图为 PNG 图片（支持网格线），方便保存与分享
- 🧩 **相似模板推荐**：基于共同标签和分类，推荐 4 个相似模板

### ❤️ 收藏管理

- 📌 **一键收藏**：卡片与详情页均可收藏，localStorage 持久化
- 🔀 **收藏排序**：按收藏时间、名称、颗数排序
- ⚠️ **清空确认**：模态弹窗二次确认，支持键盘焦点管理与 ESC 关闭

### 📢 通知与反馈

- 🔔 **Toast 通知**：收藏/复制/分享等操作均有即时反馈，自动消失，支持手动关闭

### 🎨 色卡参考库

- 🏭 **品牌色号对照**：收录 Perler、Artkal、Hama 三大主流拼豆品牌常用色号
- 🌈 **12 大色系**：白/黑/红/粉/橙/黄/绿/青/蓝/紫/棕/肤色系
- 🔎 **搜索过滤**：按颜色名称、HEX 色号、品牌编号搜索
- 🎛️ **品牌筛选**：Perler / Artkal / Hama 三品牌可多选筛选
- 📋 **一键复制**：点击色块即可复制色号，Toast 即时反馈
- 🛒 **选购指南**：品牌说明与色差提示，帮助选购拼豆材料

### ⚙️ 体验优化

- 🌓 **明暗主题**：跟随系统或手动切换，首屏无闪烁，跨标签页同步
- ⌨️ **键盘快捷键**：`/` 聚焦搜索、`←/→` 切换模板、`Esc` 返回、`?` 打开快捷键帮助
- 🔄 **跨标签页同步**：收藏、最近浏览、主题在多标签页间实时同步
- 🏷️ **动态标题**：`document.title` 随路由变化，详情页显示模板名
- 🖨️ **打印优化**：`@media print` 隐藏交互元素，详情页可打印用量清单
- 📱 **响应式布局**：适配桌面与移动端
- ♿ **无障碍**：ARIA 属性、焦点管理、全局 `:focus-visible`、弹窗 focus trap、skip-link、aria-live
- 🛡️ **错误边界**：ErrorBoundary 防止渲染异常导致白屏
- 🚀 **性能优化**：React.memo + content-visibility: auto、rAF 节流、useMemo 派生状态
- 🧭 **404 处理**：未知路由显示友好空状态，含返回首页入口

## 🛠️ 技术栈

| 技术 | 说明 |
|:----:|------|
| ⚛️ React 19 | UI 框架 |
| 🔷 TypeScript | 类型安全 |
| ⚡ Vite | 构建工具 |
| 🎨 lucide-react | 图标库 |
| 🌗 CSS Custom Properties | 主题系统（明/暗模式） |

> 项目使用手动 hash 路由（`window.location.hash` + `hashchange`），无额外路由依赖。

## 📁 项目结构

```
src/
├── components/          # 通用组件
│   ├── CategoryFilter.tsx       # 🏷️ 分类筛选条（横向滚动 + 图标）
│   ├── ErrorBoundary.tsx        # 🛡️ 错误边界
│   ├── FavoriteButton.tsx       # ❤️ 收藏按钮
│   ├── Navbar.tsx               # 🧭 顶部导航（搜索 + 主题切换）
│   ├── PixelGrid.tsx            # 🟪 像素网格渲染器
│   ├── ShortcutHelp.tsx         # ⌨️ 键盘快捷键帮助面板
│   ├── TemplateCard.tsx         # 🎴 模板卡片（全局高亮）
│   └── ToastContainer.tsx       # 🔔 Toast 通知系统
├── context/
│   └── ThemeContext.tsx         # 🌗 主题上下文（明/暗 + 跨标签页同步）
├── data/                # 📦 模板数据（JSON）
│   ├── animals.json  anime.json  celebrity.json  emoji.json  food.json
│   ├── holiday.json  kawaii.json  pixel3d.json  pokemon.json
│   └── beadColors.ts            # 🎨 拼豆色卡参考库
├── hooks/
│   ├── useFavorites.ts          # ❤️ 收藏管理（localStorage + 跨标签页同步）
│   └── useRecentlyViewed.ts     # 🕒 最近浏览（localStorage + 跨标签页同步）
├── pages/
│   ├── HomePage.tsx             # 🏠 首页（分类/搜索/排序/难度/尺寸/颜色/最近浏览）
│   ├── DetailPage.tsx           # 📋 详情页（缩放/色卡/分享/上下页/用量清单）
│   ├── FavoritesPage.tsx        # ❤️ 收藏页（排序/清空确认弹窗）
│   └── ColorReferencePage.tsx   # 🎨 色卡参考页（品牌筛选/搜索/复制）
├── types/
│   └── bead.ts                  # 📐 类型定义
├── utils/
│   └── beadStats.ts             # 🧮 从 grid 运行时计算颗数与颜色统计
│   └── exportPNG.ts             # 🖼️ 导出像素图为 PNG
├── App.tsx                      # 🏗️ 根组件（路由 + 状态 + 快捷键 + Toast）
├── categories.ts                # 🏷️ 分类定义
└── index.css                    # 🎨 全局样式（主题变量 + 响应式 + 打印 + Toast）
```

## 📐 数据格式

每个模板遵循 `BeadTemplate` 结构：

```typescript
interface BeadTemplate {
  id: string;              // 🆔 唯一标识，如 "anime-naruto-001"
  name: string;            // 📛 名称，如 "漩涡鸣人"
  category: string;        // 🏷️ 分类 ID，如 "anime"
  description: string;     // 📝 描述
  grid: number[][];        // 🟪 像素网格，0=空白，1+ = colors 数组索引+1
  colors: ColorInfo[];     // 🎨 色卡列表 {hex, name, count}
  beadCount: number;       // 🔢 总颗数（运行时从 grid 重新计算）
  difficulty: 'easy' | 'medium' | 'hard';  // 🎯 难度
  tags: string[];          // 🏷️ 标签
  source: string;          // 📖 来源
}
```

> **注意**：`beadCount` 和 `colors[].count` 在运行时会从 `grid` 重新计算（见 `utils/beadStats.ts`），确保与实际图案一致。

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 开发模式
npm run dev

# 3. 构建生产包
npm run build

# 4. 预览构建结果
npm run preview
```

## ⌨️ 快捷键

| 快捷键 | 功能 |
|:------:|------|
| `/` | 聚焦搜索框 |
| `←` / `→` | 详情页切换上/下一个模板 |
| `Esc` | 返回首页 / 关闭弹窗 |
| `?` | 显示/隐藏快捷键帮助面板 |
| `Tab` / `Shift+Tab` | 弹窗内焦点循环 |

## 🌐 浏览器支持

| 浏览器 | 最低版本 |
|:------:|:--------:|
| Chrome / Edge | 90+ |
| Firefox | 88+ |
| Safari | 14+ |

依赖 CSS Custom Properties、`localStorage`、`matchMedia`、Clipboard API 等现代浏览器特性。

## 📄 License

[MIT](LICENSE) © 拼豆收集

---

<div align="center">

**🎨 Made with ❤️ for perler bead lovers**

如果这个项目对你有帮助，欢迎 ⭐ Star 支持！

</div>
