/**
 * 模板 Repository 抽象层
 *
 * 将数据访问与存储实现解耦：当前使用 localStorage 实现，
 * 未来接后端时只需提供 RemoteTemplateRepository 实现，切换 DI 即可，不需改 hook。
 *
 * 设计原则：
 * - 接口稳定：hook 依赖接口而非实现
 * - 渐进迁移：现有 usePersistentState 不动，新功能优先使用 repository
 * - 可测试：测试时可注入 MockRepository
 */
import type { BeadTemplate } from '../types/bead';

/** Repository 读取接口（查询） */
export interface TemplateReadRepository {
  list(): Promise<BeadTemplate[]>;
  findById(id: string): Promise<BeadTemplate | null>;
  findByCategory(category: string): Promise<BeadTemplate[]>;
}

/** Repository 写入接口（命令） */
export interface TemplateWriteRepository {
  save(template: BeadTemplate): Promise<void>;
  delete(id: string): Promise<void>;
  clearAll(): Promise<void>;
}

/** 完整 Repository 接口 */
export interface TemplateRepository extends TemplateReadRepository, TemplateWriteRepository {}

// ==================== localStorage 实现 ====================

const CUSTOM_TEMPLATES_KEY = 'beads-custom-templates';

function safeParse<T>(key: string, fallback: T): T {
  try {
    const data = localStorage.getItem(key);
    if (!data) return fallback;
    return JSON.parse(data) as T;
  } catch {
    return fallback;
  }
}

function safeWrite(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

/** localStorage 自定义模板 Repository 实现 */
export class LocalTemplateRepository implements TemplateRepository {
  async list(): Promise<BeadTemplate[]> {
    return safeParse<BeadTemplate[]>(CUSTOM_TEMPLATES_KEY, []);
  }

  async findById(id: string): Promise<BeadTemplate | null> {
    const all = await this.list();
    return all.find(t => t.id === id) ?? null;
  }

  async findByCategory(category: string): Promise<BeadTemplate[]> {
    const all = await this.list();
    return all.filter(t => t.category === category);
  }

  async save(template: BeadTemplate): Promise<void> {
    const all = await this.list();
    const idx = all.findIndex(t => t.id === template.id);
    if (idx >= 0) {
      all[idx] = { ...template, updatedAt: new Date().toISOString() };
    } else {
      all.unshift({ ...template, createdAt: template.createdAt ?? new Date().toISOString() });
    }
    safeWrite(CUSTOM_TEMPLATES_KEY, all);
  }

  async delete(id: string): Promise<void> {
    const all = await this.list();
    const next = all.filter(t => t.id !== id);
    safeWrite(CUSTOM_TEMPLATES_KEY, next);
  }

  async clearAll(): Promise<void> {
    safeWrite(CUSTOM_TEMPLATES_KEY, []);
  }
}

// ==================== 工厂 + 单例 ====================

let repositoryInstance: TemplateRepository | null = null;

/** 获取 Repository 单例（当前返回 localStorage 实现，未来可切换为远程） */
export function getTemplateRepository(): TemplateRepository {
  if (!repositoryInstance) {
    repositoryInstance = new LocalTemplateRepository();
  }
  return repositoryInstance;
}

/** 注入 Repository（用于测试或未来切换为远程实现） */
export function setTemplateRepository(repo: TemplateRepository): void {
  repositoryInstance = repo;
}
