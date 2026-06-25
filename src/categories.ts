import type { Category } from './types/bead';

export const CATEGORIES: Category[] = [
  { id: 'all', name: '全部', icon: 'Grid', description: '全部模板', sortOrder: 0 },
  { id: 'anime', name: '动漫', icon: 'Sparkles', description: '日本动漫角色与场景', sortOrder: 1 },
  { id: 'pokemon', name: '游戏', icon: 'Gamepad2', description: '宝可梦、Minecraft 等游戏角色', sortOrder: 2 },
  { id: 'celebrity', name: '明星', icon: 'Star', description: '热门明星、歌手、演员像素头像', sortOrder: 3 },
  { id: 'food', name: '食物', icon: 'Coffee', description: '水果、甜品、饮品', sortOrder: 4 },
  { id: 'animals', name: '动物', icon: 'Dog', description: '萌宠与野生动物', sortOrder: 5 },
  { id: 'holiday', name: '节日', icon: 'PartyPopper', description: '春节、圣诞、万圣节等', sortOrder: 6 },
  { id: 'kawaii', name: 'Kawaii', icon: 'Heart', description: '可爱日系风格', sortOrder: 7 },
  { id: 'pixel3d', name: '3D立体', icon: 'Box', description: '立体方块作品', sortOrder: 8 },
  { id: 'emoji', name: '表情包', icon: 'Smile', description: '像素头像与 emoji 表情', sortOrder: 9 },
];
