/**
 * Agnes AI API 客户端
 *
 * 接口格式：OpenAI 兼容（/v1/chat/completions）
 * 端点：https://apihub.agnes-ai.com/v1/chat/completions
 * 认证：Authorization: Bearer <API_KEY>
 *
 * 安全说明：
 * - 纯前端项目，API Key 通过 Vite 环境变量注入（VITE_AGNES_API_KEY）
 * - GitHub Pages 部署后 Key 会暴露在前端 bundle 中
 * - 生产环境建议部署代理转发（如 Cloudflare Workers）隐藏 Key
 */

import type { ColorInfo } from '../types/bead';
import { callWithCache, buildCacheKey, withRetry } from './aiCache';

// 代理端点（如 Cloudflare Workers 代理）：配置后所有请求走代理，隐藏 API Key
const PROXY_ENDPOINT = import.meta.env.VITE_AGNES_PROXY_ENDPOINT || '';
const API_ENDPOINT = PROXY_ENDPOINT || (import.meta.env.VITE_AGNES_API_ENDPOINT || 'https://apihub.agnes-ai.com/v1/chat/completions');
// 代理模式下，图像端点由 chat 端点路径替换而来；否则使用默认图像端点
const IMAGE_API_ENDPOINT = PROXY_ENDPOINT
  ? PROXY_ENDPOINT.replace('/chat/completions', '/images/generations')
  : 'https://apihub.agnes-ai.com/v1/images/generations';
// 环境变量优先；无环境变量时使用内置 key（纯前端项目 key 会暴露，仅用于个人项目）
const BUILTIN_API_KEY = 'sk-Izfj0ii6fTarzwEfKyWO1ETsF8EohiGohyhQetdZe9WBcC78';
const API_KEY = import.meta.env.VITE_AGNES_API_KEY || BUILTIN_API_KEY;
const MODEL = import.meta.env.VITE_AGNES_MODEL || 'agnes-2.0-flash';

/** 检查 API Key 是否已配置 */
export function isAgnesConfigured(): boolean {
  return API_KEY.length > 0 && API_KEY !== 'your_api_key_here';
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AgnesRequestOptions {
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** 流式响应回调（未实现则等待完整响应） */
  onStream?: (chunk: string) => void;
  /** 流式推理内容回调（reasoning_content，思考过程） */
  onReasoning?: (chunk: string) => void;
  signal?: AbortSignal;
}

interface AgnesResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

/**
 * 核心 API 调用函数（OpenAI 兼容格式）
 */
async function callAgnes(opts: AgnesRequestOptions): Promise<string> {
  if (!isAgnesConfigured()) {
    throw new AgnesError('not_configured', 'API Key 未配置');
  }

  const body: Record<string, unknown> = {
    model: MODEL,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.7,
    max_tokens: opts.maxTokens ?? 4000,
  };

  // 流式响应
  if (opts.onStream) {
    body.stream = true;
    const res = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
    if (!res.ok) {
      throw new AgnesError('http_error', `HTTP ${res.status}: ${await res.text().catch(() => '')}`);
    }
    // 解析 SSE 流
    const reader = res.body?.getReader();
    if (!reader) throw new AgnesError('stream_error', '无法读取流');
    const decoder = new TextDecoder();
    let full = '';
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta;
          // 推理内容（思考过程）：单独回调，不进入正文
          if (delta?.reasoning_content && opts.onReasoning) {
            opts.onReasoning(delta.reasoning_content);
          }
          // 正文内容
          if (delta?.content) {
            full += delta.content;
            opts.onStream(delta.content);
          }
        } catch {
          // 忽略解析失败的行
        }
      }
    }
    return full;
  }

  // 非流式响应
  const res = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new AgnesError('http_error', `HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as AgnesResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new AgnesError('empty_response', 'API 返回空内容');
  }
  return content;
}

/** 自定义错误类型 */
export class AgnesError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AgnesError';
    this.code = code;
  }
}

// ============ 拼豆图案生成 ============

/** AI 生成的拼豆图案结果 */
export interface AIGeneratedPattern {
  grid: number[][];
  colors: ColorInfo[];
  name: string;
  description: string;
}

/** 从 AI 文本响应中提取 JSON（支持 ```json 代码块包裹） */
function extractJSON(text: string): unknown {
  // 尝试提取 ```json ... ``` 代码块
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();
  return JSON.parse(jsonStr);
}

/**
 * 用 AI 生成拼豆图案
 * 返回结构化的 grid + colors 数据
 */
export async function generatePatternWithAI(
  prompt: string,
  options?: { size?: number; signal?: AbortSignal }
): Promise<AIGeneratedPattern> {
  const size = options?.size ?? 16;
  const systemPrompt = `你是一个拼豆图案设计专家。根据用户的描述生成拼豆图案。

输出格式：严格的 JSON，不要包含其他文字。
JSON 结构：
{
  "name": "图案名称（简短）",
  "description": "一句话描述",
  "size": ${size},
  "colors": [{"hex": "#rrggbb", "name": "颜色名"}, ...],
  "grid": [[0,1,1,0], [1,0,0,1], ...]
}

规则：
1. grid 是 ${size}×${size} 的二维数组，每个值是 colors 数组的索引+1（1-based），0 表示空白
2. colors 数组最多 8 种颜色，hex 必须是 #rrggbb 格式
3. 图案要美观、对称、可识别
4. 使用尽量少的颜色（3-5 种为佳）
5. 颜色要有对比度，避免过多相近色调`;

  const content = await callWithCache(
    buildCacheKey(prompt, { size }),
    () => withRetry(() => callAgnes({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      maxTokens: 8000,
      signal: options?.signal,
    })),
    options?.signal
  );

  try {
    const parsed = extractJSON(content) as {
      name: string;
      description: string;
      size: number;
      colors: Array<{ hex: string; name: string }>;
      grid: number[][];
    };

    // 校验
    if (!Array.isArray(parsed.grid) || !Array.isArray(parsed.colors)) {
      throw new Error('格式错误：grid 或 colors 不是数组');
    }
    if (parsed.grid.length === 0 || parsed.colors.length === 0) {
      throw new Error('格式错误：grid 或 colors 为空');
    }

    // 转换为 ColorInfo
    const colors: ColorInfo[] = parsed.colors.map(c => ({
      hex: c.hex,
      name: c.name,
      count: 0,
    }));

    // 统计颜色用量
    for (const row of parsed.grid) {
      for (const v of row) {
        if (v > 0 && v <= colors.length) {
          colors[v - 1].count = (colors[v - 1].count ?? 0) + 1;
        }
      }
    }

    return {
      grid: parsed.grid,
      colors,
      name: parsed.name || 'AI 生成',
      description: parsed.description || '',
    };
  } catch (e) {
    throw new AgnesError('parse_error', `解析 AI 返回的 JSON 失败: ${e instanceof Error ? e.message : ''}`);
  }
}

// ============ 聊天助手 ============

export interface ChatMessageResult {
  role: 'assistant';
  content: string;
}

/**
 * 聊天助手：多轮对话
 *
 * 可选 context 参数用于注入当前用户上下文（所在页面、模板、收藏数等），
 * 帮助 AI 给出更贴合用户当前场景的回答。
 */
export async function chatWithAgnes(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options?: {
    onStream?: (chunk: string) => void;
    onReasoning?: (chunk: string) => void;
    signal?: AbortSignal;
    context?: {
      page?: string;
      templateName?: string;
      favoritesCount?: number;
      progressPercent?: number;
    };
  }
): Promise<string> {
  let systemPrompt = `你是"拼豆助手"，一个专注于拼豆（Perler Bead）制作的 AI 助手。

你的职责：
1. 帮助用户选择拼豆图案、配色方案
2. 解答拼豆制作技巧（熨烫、拼接、保存等）
3. 提供创意灵感和设计建议
4. 介绍拼豆材料和工具

回答风格：
- 友好、热情、简洁
- 使用中文回答（除非用户用英文提问）
- 适当使用 emoji 增加亲和力
- 如果用户问的是拼豆之外的话题，礼貌引导回拼豆主题`;

  // 注入用户上下文（如有）
  const ctx = options?.context;
  if (ctx) {
    const lines: string[] = ['', '当前用户上下文：'];
    if (ctx.page !== undefined) lines.push(`- 所在页面：${ctx.page}`);
    if (ctx.templateName !== undefined) lines.push(`- 正在查看的模板：${ctx.templateName}（如有）`);
    if (ctx.favoritesCount !== undefined) lines.push(`- 收藏数：${ctx.favoritesCount}`);
    if (ctx.progressPercent !== undefined) lines.push(`- 制作进度：${ctx.progressPercent}%`);
    lines.push('请基于此上下文回答用户问题。');
    systemPrompt += '\n' + lines.join('\n');
  }

  const allMessages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...messages.map(m => ({ role: m.role, content: m.content }) as ChatMessage),
  ];

  // 对话不缓存（上下文每次不同），但重试以提升稳定性
  return withRetry(() => callAgnes({
    messages: allMessages,
    temperature: 0.7,
    maxTokens: 2000,
    onStream: options?.onStream,
    onReasoning: options?.onReasoning,
    signal: options?.signal,
  }));
}

// ============ 智能搜索建议 ============

export interface SearchSuggestion {
  keyword: string;
  reason: string;
}

/**
 * 根据用户输入生成搜索建议
 */
export async function getSearchSuggestions(
  query: string,
  options?: { signal?: AbortSignal }
): Promise<SearchSuggestion[]> {
  if (!query.trim()) return [];

  const systemPrompt = `你是拼豆模板搜索助手。根据用户输入，推荐 5 个相关的搜索关键词。

输出格式：JSON 数组
[{"keyword": "关键词", "reason": "推荐原因（简短）"}]

规则：
- 关键词要和拼豆相关（动漫、游戏、食物、动物、节日等）
- 每个原因不超过 15 字
- 使用中文`;

  const content = await callWithCache(
    buildCacheKey(query),
    () => withRetry(() => callAgnes({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: query },
      ],
      temperature: 0.5,
      maxTokens: 1000,
      signal: options?.signal,
    })),
    options?.signal
  );

  try {
    const parsed = extractJSON(content);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, 5).map((item: { keyword?: string; reason?: string }) => ({
      keyword: String(item.keyword ?? ''),
      reason: String(item.reason ?? ''),
    })).filter(s => s.keyword);
  } catch {
    return [];
  }
}

// ============ 图像描述生成（用于上传页参考） ============

/**
 * 让 AI 描述一个拼豆图案的设计思路（不生成图像，仅文字建议）
 */
export async function getDesignAdvice(
  prompt: string,
  options?: { signal?: AbortSignal }
): Promise<string> {
  const systemPrompt = `你是拼豆设计顾问。根据用户的需求描述，给出具体的设计建议，包括：
1. 推荐的配色方案（列出具体 hex 色值）
2. 建议的网格尺寸
3. 图案布局建议
4. 可能的难点提醒

回答简洁，用中文，不超过 300 字。`;

  return callAgnes({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: 0.6,
    maxTokens: 1500,
    signal: options?.signal,
  });
}

// ============ 图像生成（agnes-image-2.1-flash） ============

// IMAGE_API_ENDPOINT 已在文件顶部常量区定义（支持代理）
const IMAGE_MODEL = 'agnes-image-2.1-flash';

/** 图像生成结果 */
export interface GeneratedImage {
  url: string | null;
  base64: string | null;
}

/**
 * 文生图：根据文本提示词生成图像
 *
 * 注意：Agnes 图像 API 的 response_format 必须放在 extra_body 里，
 * 不能放在请求体顶层。
 */
export async function generateImage(
  prompt: string,
  options?: {
    size?: string;       // 默认 1024x768
    returnBase64?: boolean;
    signal?: AbortSignal;
  }
): Promise<GeneratedImage> {
  if (!isAgnesConfigured()) {
    throw new AgnesError('not_configured', 'API Key 未配置');
  }

  const size = options?.size ?? '1024x768';
  const returnBase64 = options?.returnBase64 ?? false;

  const body: Record<string, unknown> = {
    model: IMAGE_MODEL,
    prompt,
    size,
  };

  if (returnBase64) {
    body.return_base64 = true;
  } else {
    // response_format 必须放在 extra_body 里
    body.extra_body = { response_format: 'url' };
  }

  const res = await fetch(IMAGE_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: options?.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new AgnesError('http_error', `HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json() as {
    data: Array<{ url?: string | null; b64_json?: string | null }>;
  };

  const item = data.data?.[0];
  if (!item) {
    throw new AgnesError('empty_response', '图像生成返回空数据');
  }

  return {
    url: item.url ?? null,
    base64: item.b64_json ?? null,
  };
}

/**
 * 图生图：基于输入图像进行转换/重绘
 *
 * @param prompt 转换指令（如"改为赛博朋克风格"）
 * @param imageUrl 输入图像的公开 URL 或 Data URI Base64
 */
export async function editImage(
  prompt: string,
  imageUrl: string,
  options?: {
    size?: string;
    returnBase64?: boolean;
    signal?: AbortSignal;
  }
): Promise<GeneratedImage> {
  if (!isAgnesConfigured()) {
    throw new AgnesError('not_configured', 'API Key 未配置');
  }

  const size = options?.size ?? '1024x768';
  const responseFormat = options?.returnBase64 ? 'b64_json' : 'url';

  // 图生图：image 和 response_format 都放在 extra_body 里
  const body = {
    model: IMAGE_MODEL,
    prompt,
    size,
    extra_body: {
      image: [imageUrl],
      response_format: responseFormat,
    },
  };

  const res = await fetch(IMAGE_API_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: options?.signal,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new AgnesError('http_error', `HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json() as {
    data: Array<{ url?: string | null; b64_json?: string | null }>;
  };

  const item = data.data?.[0];
  if (!item) {
    throw new AgnesError('empty_response', '图像生成返回空数据');
  }

  return {
    url: item.url ?? null,
    base64: item.b64_json ?? null,
  };
}
