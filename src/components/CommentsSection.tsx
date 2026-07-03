import { useState, useCallback } from 'react';
import { MessageSquare, Send, Star, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import type { Comment } from '../hooks/useComments';
import { COMMENT_LIMITS } from '../hooks/useComments';
import { useTranslation } from '../context/LanguageContext';
import { useToast } from './ToastContainer';

interface CommentsSectionProps {
  templateId: string;
  comments: Comment[];
  averageRating: number;
  count: number;
  onAdd: (author: string, text: string, rating: number) => void;
  onDelete: (commentId: string) => void;
  onClearAll: () => void;
}

/**
 * 社区评论与评分区：可折叠。
 * - 顶部显示平均评分、评论数
 * - 评论表单：作者 + 评分 + 内容
 * - 评论列表：按时间倒序，每条可删除
 */
export default function CommentsSection({
  templateId,
  comments,
  averageRating,
  count,
  onAdd,
  onDelete,
  onClearAll,
}: CommentsSectionProps) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);
  // 悬停预览的评分（用于交互反馈）
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = useCallback(() => {
    if (!text.trim()) {
      showToast(t('comment.error.empty'), 'error');
      return;
    }
    onAdd(author, text, rating);
    setAuthor('');
    setText('');
    setRating(5);
    showToast(t('comment.posted'), 'success');
  }, [author, text, rating, onAdd, showToast, t]);

  const handleDelete = useCallback((id: string) => {
    if (confirm(t('comment.deleteConfirm'))) {
      onDelete(id);
      showToast(t('comment.deleted'), 'info');
    }
  }, [onDelete, showToast, t]);

  const handleClearAll = useCallback(() => {
    if (count === 0) return;
    if (confirm(t('comment.clearAllConfirm'))) {
      onClearAll();
      showToast(t('comment.cleared'), 'info');
    }
  }, [count, onClearAll, showToast, t]);

  // 平均评分四舍五入到 0.5
  const avgDisplay = averageRating > 0 ? averageRating.toFixed(1) : '—';
  // templateId 用于触发 key 变化（实际不直接使用）
  void templateId;

  return (
    <section className="comments-section" aria-label={t('comment.title')}>
      <button
        type="button"
        className="comments-section__header"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        aria-controls="comments-body"
      >
        <MessageSquare size={18} aria-hidden="true" />
        <span className="comments-section__title">{t('comment.title')}</span>
        <span className="comments-section__summary" aria-hidden="true">
          <Star size={14} fill="#f59e0b" color="#f59e0b" />
          {avgDisplay}
          <span className="comments-section__count">({count})</span>
        </span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div id="comments-body" className="comments-section__body">
          {/* 评论表单 */}
          <div className="comments-form">
            <div className="comments-form__row">
              <input
                type="text"
                className="comments-form__author"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder={t('comment.authorPlaceholder')}
                maxLength={COMMENT_LIMITS.MAX_AUTHOR_LENGTH}
                aria-label={t('comment.authorLabel')}
              />
            </div>
            <div className="comments-form__row comments-form__row--rating" role="radiogroup" aria-label={t('comment.ratingLabel')}>
              {[1, 2, 3, 4, 5].map(star => {
                const active = (hoverRating || rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    className="comments-form__star-btn"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    role="radio"
                    aria-checked={rating === star}
                    aria-label={t('comment.ratingStar', { stars: star })}
                  >
                    <Star
                      size={22}
                      fill={active ? '#f59e0b' : 'none'}
                      color={active ? '#f59e0b' : '#9ca3af'}
                    />
                  </button>
                );
              })}
            </div>
            <textarea
              className="comments-form__text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('comment.textPlaceholder')}
              rows={3}
              maxLength={COMMENT_LIMITS.MAX_TEXT_LENGTH}
              aria-label={t('comment.textLabel')}
            />
            <div className="comments-form__footer">
              <span className="comments-form__counter" aria-hidden="true">
                {text.length}/{COMMENT_LIMITS.MAX_TEXT_LENGTH}
              </span>
              <button
                type="button"
                className="comments-form__submit"
                onClick={handleSubmit}
                disabled={!text.trim()}
              >
                <Send size={16} aria-hidden="true" />
                {t('comment.submit')}
              </button>
            </div>
          </div>

          {/* 评论列表 */}
          {comments.length === 0 ? (
            <p className="comments-section__empty">{t('comment.empty')}</p>
          ) : (
            <ul className="comments-list">
              {comments.map(c => (
                <li key={c.id} className="comment-item">
                  <div className="comment-item__avatar" aria-hidden="true">
                    {c.author.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="comment-item__body">
                    <div className="comment-item__header">
                      <span className="comment-item__author">{c.author}</span>
                      <span className="comment-item__stars" aria-label={t('comment.ratingStar', { stars: c.rating })}>
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            size={12}
                            fill={s <= c.rating ? '#f59e0b' : 'none'}
                            color={s <= c.rating ? '#f59e0b' : '#d1d5db'}
                          />
                        ))}
                      </span>
                      <span className="comment-item__date">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        className="comment-item__delete"
                        onClick={() => handleDelete(c.id)}
                        aria-label={t('comment.deleteAria')}
                        title={t('comment.delete')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <p className="comment-item__text">{c.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {count > 0 && (
            <button
              type="button"
              className="comments-section__clear"
              onClick={handleClearAll}
            >
              {t('comment.clearAll')}
            </button>
          )}
        </div>
      )}
    </section>
  );
}
