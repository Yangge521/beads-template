/**
 * Agnes AI Hook - 封装 AI 调用逻辑
 *
 * 提供：
 * - generatePattern: AI 生成拼豆图案
 * - chat: 聊天助手
 * - getSuggestions: 搜索建议
 * - getAdvice: 设计建议
 * - isConfigured: API Key 是否已配置
 * - error: 最近一次错误
 */

import { useState, useCallback, useRef } from 'react';
import {
  generatePatternWithAI,
  chatWithAgnes,
  getSearchSuggestions,
  getDesignAdvice,
  generateImage,
  editImage,
  isAgnesConfigured,
  AgnesError,
} from '../utils/agnesClient';
import type { AIGeneratedPattern, SearchSuggestion, GeneratedImage } from '../utils/agnesClient';

export function useAgnesAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  /** 取消正在进行的请求 */
  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
  }, []);

  const execute = useCallback(async <T,>(
    fn: (signal: AbortSignal) => Promise<T>
  ): Promise<T | null> => {
    // 取消上一个请求
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const result = await fn(controller.signal);
      return result;
    } catch (e) {
      if (e instanceof AgnesError) {
        setError(e.message);
      } else if (e instanceof Error && e.name === 'AbortError') {
        // 用户取消，不设置错误
        return null;
      } else {
        setError(e instanceof Error ? e.message : '未知错误');
      }
      return null;
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setLoading(false);
    }
  }, []);

  /** AI 生成拼豆图案 */
  const generatePattern = useCallback((prompt: string, size?: number) => {
    return execute<AIGeneratedPattern>((signal) => generatePatternWithAI(prompt, { size, signal }));
  }, [execute]);

  /** 聊天助手 */
  const chat = useCallback((
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    onStream?: (chunk: string) => void,
    onReasoning?: (chunk: string) => void,
    context?: { page?: string; templateName?: string; favoritesCount?: number; progressPercent?: number }
  ) => {
    return execute<string>((signal) => chatWithAgnes(messages, { onStream, onReasoning, signal, context }));
  }, [execute]);

  /** 搜索建议 */
  const getSuggestions = useCallback((query: string) => {
    return execute<SearchSuggestion[]>((signal) => getSearchSuggestions(query, { signal }));
  }, [execute]);

  /** 设计建议 */
  const getAdvice = useCallback((prompt: string) => {
    return execute<string>((signal) => getDesignAdvice(prompt, { signal }));
  }, [execute]);

  /** 文生图 */
  const generateArtwork = useCallback((prompt: string, size?: string, returnBase64?: boolean) => {
    return execute<GeneratedImage>((signal) => generateImage(prompt, { size, returnBase64, signal }));
  }, [execute]);

  /** 图生图 */
  const editArtwork = useCallback((prompt: string, imageUrl: string, size?: string, returnBase64?: boolean) => {
    return execute<GeneratedImage>((signal) => editImage(prompt, imageUrl, { size, returnBase64, signal }));
  }, [execute]);

  return {
    loading,
    error,
    isConfigured: isAgnesConfigured(),
    generatePattern,
    chat,
    getSuggestions,
    getAdvice,
    generateArtwork,
    editArtwork,
    cancel,
  };
}
