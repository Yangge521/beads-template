/**
 * 拼豆 AI 聊天助手
 *
 * 浮动在右下角的可折叠聊天面板，支持：
 * - 多轮对话
 * - 流式响应
 * - 快捷问题
 * - API 未配置时的提示
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot } from 'lucide-react';
import { useAgnesAI } from '../hooks/useAgnesAI';
import { useTranslation } from '../context/LanguageContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const QUICK_QUESTIONS = [
  'ai.chat.quick.color',
  'ai.chat.quick.size',
  'ai.chat.quick.iron',
  'ai.chat.quick.idea',
];

export default function ChatAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const agnes = useAgnesAI();
  const { t } = useTranslation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText, open]);

  // 打开时自动聚焦输入框
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const handleSend = useCallback(async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || agnes.loading) return;

    if (!agnes.isConfigured) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t('ai.agnes.notConfigured'),
      }]);
      return;
    }

    const userMsg: Message = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setStreamingText('');

    // 流式回调
    const result = await agnes.chat(newMessages, (chunk) => {
      setStreamingText(prev => prev + chunk);
    });

    if (result) {
      setMessages(prev => [...prev, { role: 'assistant', content: result }]);
    } else if (agnes.error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t('ai.agnes.failed', { error: agnes.error || '' }),
      }]);
    }
    setStreamingText('');
  }, [input, messages, agnes, t]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleClear = useCallback(() => {
    setMessages([]);
    setStreamingText('');
  }, []);

  if (!open) {
    return (
      <button
        type="button"
        className="chat-fab"
        onClick={() => setOpen(true)}
        aria-label={t('ai.chat.open')}
        title={t('ai.chat.open')}
      >
        <MessageCircle size={24} aria-hidden="true" />
      </button>
    );
  }

  return (
    <div className="chat-panel" role="dialog" aria-label={t('ai.chat.title')}>
      <header className="chat-panel__header">
        <div className="chat-panel__title">
          <Bot size={18} aria-hidden="true" />
          <span>{t('ai.chat.title')}</span>
        </div>
        <div className="chat-panel__actions">
          {messages.length > 0 && (
            <button
              type="button"
              className="chat-panel__btn"
              onClick={handleClear}
              aria-label={t('ai.chat.clear')}
              title={t('ai.chat.clear')}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
          <button
            type="button"
            className="chat-panel__btn"
            onClick={() => setOpen(false)}
            aria-label={t('ai.chat.close')}
            title={t('ai.chat.close')}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="chat-panel__messages">
        {messages.length === 0 && !streamingText && (
          <div className="chat-panel__welcome">
            <Bot size={40} aria-hidden="true" />
            <p className="chat-panel__welcome-title">{t('ai.chat.welcome')}</p>
            <p className="chat-panel__welcome-desc">{t('ai.chat.welcomeDesc')}</p>
            <div className="chat-panel__quick">
              {QUICK_QUESTIONS.map(qKey => (
                <button
                  key={qKey}
                  type="button"
                  className="chat-panel__quick-btn"
                  onClick={() => handleSend(t(qKey))}
                >
                  {t(qKey)}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
            <div className="chat-msg__avatar" aria-hidden="true">
              {msg.role === 'user' ? '👤' : '🤖'}
            </div>
            <div className="chat-msg__bubble">
              {msg.content}
            </div>
          </div>
        ))}
        {streamingText && (
          <div className="chat-msg chat-msg--assistant">
            <div className="chat-msg__avatar" aria-hidden="true">🤖</div>
            <div className="chat-msg__bubble">
              {streamingText}
              <span className="chat-msg__cursor" aria-hidden="true">▊</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-panel__input-area">
        <textarea
          ref={inputRef}
          className="chat-panel__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('ai.chat.placeholder')}
          rows={1}
          disabled={agnes.loading}
          aria-label={t('ai.chat.placeholder')}
        />
        <button
          type="button"
          className="chat-panel__send"
          onClick={() => handleSend()}
          disabled={!input.trim() || agnes.loading}
          aria-label={t('ai.chat.send')}
        >
          {agnes.loading ? (
            <div className="chat-panel__spinner" aria-hidden="true" />
          ) : (
            <Send size={18} aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
