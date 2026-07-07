import { useState, useCallback } from 'react';
import { useStorageSync } from './useStorageSync';

const STORAGE_KEY = 'beads-comments';
const MAX_COMMENTS_PER_TEMPLATE = 100;
const MAX_TEXT_LENGTH = 500;
const MAX_AUTHOR_LENGTH = 30;

export interface Comment {
  id: string;
  templateId: string;
  author: string;
  text: string;
  /** 1-5 星评分 */
  rating: number;
  createdAt: number;
}

function loadComments(): Comment[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (c: unknown): c is Comment =>
            typeof c === 'object' &&
            c !== null &&
            typeof (c as Comment).id === 'string' &&
            typeof (c as Comment).templateId === 'string' &&
            typeof (c as Comment).text === 'string'
        );
      }
    }
  } catch { /* 损坏数据回退默认值 */ }
  return [];
}

function saveComments(comments: Comment[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  } catch { /* 隐私模式忽略 */ }
}

function genId(): string {
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface UseCommentsResult {
  comments: Comment[];
  /** 指定模板的评论（按时间倒序） */
  getByTemplate: (templateId: string) => Comment[];
  /** 指定模板的平均评分（无评论时为 0） */
  getAverageRating: (templateId: string) => number;
  /** 指定模板的评论数 */
  getCount: (templateId: string) => number;
  /** 添加评论，返回新建的 Comment 或 null（超出上限/校验失败） */
  addComment: (templateId: string, author: string, text: string, rating: number) => Comment | null;
  /** 删除评论 */
  deleteComment: (commentId: string) => void;
  /** 清空指定模板的所有评论 */
  clearByTemplate: (templateId: string) => void;
}

/**
 * 评论与社区评分 hook：
 * - 所有评论存储在 localStorage 单 key 中
 * - 跨标签页同步
 * - 每模板最多 100 条
 */
export function useComments(): UseCommentsResult {
  const [comments, setComments] = useState<Comment[]>(loadComments);

  // 跨标签页同步
  useStorageSync(STORAGE_KEY, () => setComments(loadComments()));

  const persist = useCallback((next: Comment[]) => {
    saveComments(next);
    setComments(next);
  }, []);

  const getByTemplate = useCallback(
    (templateId: string) =>
      comments
        .filter(c => c.templateId === templateId)
        .sort((a, b) => b.createdAt - a.createdAt),
    [comments]
  );

  const getAverageRating = useCallback(
    (templateId: string) => {
      const list = comments.filter(c => c.templateId === templateId);
      if (list.length === 0) return 0;
      const sum = list.reduce((acc, c) => acc + c.rating, 0);
      return sum / list.length;
    },
    [comments]
  );

  const getCount = useCallback(
    (templateId: string) => comments.filter(c => c.templateId === templateId).length,
    [comments]
  );

  const addComment = useCallback(
    (templateId: string, author: string, text: string, rating: number): Comment | null => {
      const trimmedAuthor = author.trim().slice(0, MAX_AUTHOR_LENGTH);
      const trimmedText = text.trim().slice(0, MAX_TEXT_LENGTH);
      const safeRating = Math.max(1, Math.min(5, Math.round(rating)));
      if (!trimmedText) return null;
      const existing = comments.filter(c => c.templateId === templateId);
      if (existing.length >= MAX_COMMENTS_PER_TEMPLATE) return null;
      const comment: Comment = {
        id: genId(),
        templateId,
        author: trimmedAuthor || 'Anonymous',
        text: trimmedText,
        rating: safeRating,
        createdAt: Date.now(),
      };
      persist([...comments, comment]);
      return comment;
    },
    [comments, persist]
  );

  const deleteComment = useCallback(
    (commentId: string) => {
      persist(comments.filter(c => c.id !== commentId));
    },
    [comments, persist]
  );

  const clearByTemplate = useCallback(
    (templateId: string) => {
      persist(comments.filter(c => c.templateId !== templateId));
    },
    [comments, persist]
  );

  return {
    comments,
    getByTemplate,
    getAverageRating,
    getCount,
    addComment,
    deleteComment,
    clearByTemplate,
  };
}

export const COMMENT_LIMITS = {
  MAX_TEXT_LENGTH,
  MAX_AUTHOR_LENGTH,
  MAX_COMMENTS_PER_TEMPLATE,
};
