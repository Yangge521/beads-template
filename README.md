# 拼豆收集 · Perler Bead Templates

一个专注于拼豆（Perler Bead / 熨斗豆）图案模板的收集与浏览应用。收录动漫、游戏、食物、动物、节日等多种分类的像素图案，提供色卡、网格预览、收藏与快捷搜索，方便拼豆爱好者对照制作。

## 功能特性

### 浏览与搜索
- **分类筛选**：9 大分类（动漫、游戏、食物、动物、节日、Kawaii、3D 立体、表情包），带分类图标与数量计数
- **难度筛选**：简单 / 中等 / 困难 三级过滤
- **多维度排序**：默认、名称、颗数升降序、难度
- **即时搜索**：300ms 防抖搜索，匹配名称、标签、描述，命中关键词高亮
- **最近浏览**：首页横滑展示最近查看的模板，最多 8 个

### 详情页
- **像素网格**：支持 0.5x ~ 3x 缩放、网格线切换
- **色卡面板**：点击复制单个色号，一键复制全部色卡
- **颜色占比**：每色显示颗数与占比条形图，直观了解颜色分布
- **统计信息**：总颗数、颜色数、网格尺寸
- **上下页导航**：基于全量列表的前后切换
- **分享链接**：优先调用系统分享面板，回退到剪贴板复制

### 收藏管理
- **一键收藏**：卡片与详情页均可收藏，localStorage 持久化
- **收藏排序**：按收藏时间、名称、颗数排序
- **清空确认**：模态弹窗二次确认，支持键盘焦点管理与 ESC 关闭

### 体验优化
- **明暗主题**：跟随系统或手动切换，首屏无闪烁（FOUC），跨标签页同步
- **键盘快捷键**：`/` 聚焦搜索、`←/→` 切换模板、`Esc` 返回
- **跨标签页同步**：收藏、最近浏览、主题在多标签页间实时同步
- **打印优化**：`@media print` 隐藏交互元素，只保留网格与色卡
- **响应式布局**：适配桌面与移动端
- **无障碍**：ARIA 属性、焦点管理、焦点环、弹窗 focus trap
- **错误边界**：ErrorBoundary 防止渲染异常导致白屏

## 技术栈

| 技术 | 说明 |
|------|------|
| React 19 | UI 框架 |
| TypeScript | 类型安全 |
| Vite | 构建工具 |
| lucide-react | 图标库 |
| CSS Custom Properties | 主题系统（明/暗模式） |

> 项目使用手动 hash 路由（`window.location.hash` + `hashchange`），无额外路由依赖。

## 项目结构

```
src/
├── components/          # 通用组件
│   ├── CategoryFilter.tsx   # 分类筛选条（横向滚动 + 图标）
│   ├── ErrorBoundary.tsx    # 错误边界
│   ├── FavoriteButton.tsx   # 收藏按钮
│   ├── Navbar.tsx           # 顶部导航（搜索 + 主题切换）
│   ├── PixelGrid.tsx        # 像素网格渲染器
│   └── TemplateCard.tsx     # 模板卡片
├── context/
│   └── ThemeContext.tsx     # 主题上下文（明/暗 + 跨标签页同步）
├── data/                # 模板数据（JSON）
│   ├── animals.json  anime.json  emoji.json  food.json
│   └── holiday.json  kawaii.json  pixel3d.json  pokemon.json
├── hooks/
│   ├── useFavorites.ts       # 收藏管理（localStorage + 跨标签页同步）
│   └── useRecentlyViewed.ts  # 最近浏览（localStorage + 跨标签页同步）
├── pages/
│   ├── HomePage.tsx         # 首页（分类/搜索/排序/难度/最近浏览）
│   ├── DetailPage.tsx       # 详情页（缩放/色卡/分享/上下页）
│   └── FavoritesPage.tsx    # 收藏页（排序/清空确认弹窗）
├── types/
│   └── bead.ts              # 类型定义
├── utils/
│   └── beadStats.ts         # 从 grid 运行时计算颗数与颜色统计
├── App.tsx                  # 根组件（路由 + 状态 + 快捷键）
├── categories.ts            # 分类定义
└── index.css                # 全局样式（主题变量 + 响应式 + 打印）
```

## 数据格式

每个模板遵循 `BeadTemplate` 结构：

```typescript
interface BeadTemplate {
  id: string;              // 唯一标识，如 "anime-naruto-001"
  name: string;            // 名称，如 "漩涡鸣人"
  category: string;        // 分类 ID，如 "anime"
  description: string;     // 描述
  grid: number[][];        // 像素网格，0=空白，1+ = colors 数组索引+1
  colors: ColorInfo[];     // 色卡列表 {hex, name, count}
  beadCount: number;       // 总颗数（运行时从 grid 重新计算，以实际为准）
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];          // 标签
  source: string;          // 来源
}
```

> **注意**：`beadCount` 和 `colors[].count` 在运行时会从 `grid` 重新计算（见 `utils/beadStats.ts`），确保与实际图案一致。

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式
npm run dev

# 构建生产包
npm run build

# 预览构建结果
npm run preview
```

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `/` | 聚焦搜索框 |
| `←` / `→` | 详情页切换上/下一个模板 |
| `Esc` | 返回首页 / 关闭弹窗 |
| `Tab` / `Shift+Tab` | 弹窗内焦点循环 |

## 浏览器支持

- Chrome / Edge 90+
- Firefox 88+
- Safari 14+

依赖 CSS Custom Properties、`localStorage`、`matchMedia`、Clipboard API 等现代浏览器特性。

## License

MIT
