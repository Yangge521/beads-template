import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
  Home, Heart, Palette, Upload, Pencil, Sparkles, Share2, Search as SearchIcon,
  Sun, Moon, Languages, X, CornerDownLeft, ChevronUp, ChevronDown,
} from 'lucide-react';
import type { BeadTemplate } from '../types/bead';
import { multiFieldPinyinMatch } from '../utils/pinyinSearch';

interface Command {
  id: string;
  type: 'nav' | 'action' | 'template';
  label: string;
  hint?: string;
  icon: ReactNode;
  action: () => void;
  keywords?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  templates: BeadTemplate[];
  onNavigate: (hash: string) => void;
  onToggleTheme: () => void;
  onToggleLanguage: () => void;
  onSearch: (q: string) => void;
}

/**
 * 全局命令面板（Cmd/Ctrl+K 唤起）
 * 支持模糊搜索：跳转命令、模板、主题/语言切换。
 */
export default function CommandPalette({
  open, onClose, templates, onNavigate, onToggleTheme, onToggleLanguage, onSearch,
}: CommandPaletteProps) {
  const { t, lang } = useTranslation();
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // 基础命令列表
  const baseCommands: Command[] = useMemo(() => {
    const cmds: Command[] = [
      { id: 'nav-home', type: 'nav', label: t('nav.brand'), hint: t('cmd.hint.go'), icon: <Home size={16} />, action: () => onNavigate('/'), keywords: 'home index 首页' },
      { id: 'nav-favorites', type: 'nav', label: t('favorites.title'), hint: t('cmd.hint.go'), icon: <Heart size={16} />, action: () => onNavigate('favorites'), keywords: 'favorites 收藏 heart' },
      { id: 'nav-colors', type: 'nav', label: t('nav.colorRef.title'), hint: t('cmd.hint.go'), icon: <Palette size={16} />, action: () => onNavigate('colors'), keywords: 'color ref 色卡' },
      { id: 'nav-upload', type: 'nav', label: t('nav.upload.title'), hint: t('cmd.hint.go'), icon: <Upload size={16} />, action: () => onNavigate('upload'), keywords: 'upload image 上传' },
      { id: 'nav-editor', type: 'nav', label: t('editor.title'), hint: t('cmd.hint.go'), icon: <Pencil size={16} />, action: () => onNavigate('editor'), keywords: 'editor edit 编辑器' },
      { id: 'nav-ai', type: 'nav', label: t('ai.title'), hint: t('cmd.hint.go'), icon: <Sparkles size={16} />, action: () => onNavigate('ai'), keywords: 'ai generate 生成' },
      { id: 'nav-community', type: 'nav', label: t('community.title'), hint: t('cmd.hint.go'), icon: <Share2 size={16} />, action: () => onNavigate('community'), keywords: 'community share 社区分享' },
      { id: 'act-theme', type: 'action', label: theme === 'dark' ? t('nav.theme.toggleToLight') : t('nav.theme.toggleToDark'), hint: t('cmd.hint.toggle'), icon: theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />, action: onToggleTheme, keywords: 'theme dark light 主题 明暗' },
      { id: 'act-lang', type: 'action', label: lang === 'zh' ? 'English' : '中文', hint: t('cmd.hint.toggle'), icon: <Languages size={16} />, action: onToggleLanguage, keywords: 'language en zh 语言' },
    ];
    return cmds;
  }, [t, lang, theme, onNavigate, onToggleTheme, onToggleLanguage]);

  // 过滤命令 + 模板搜索
  const filteredCommands = useMemo<Command[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return baseCommands;

    // 同时匹配模板（支持拼音搜索）
    const matchedTemplates: Command[] = templates
      .filter(tpl => multiFieldPinyinMatch([tpl.name, ...tpl.tags, tpl.description], q))
      .slice(0, 8)
      .map(tpl => ({
        id: `tpl-${tpl.id}`,
        type: 'template' as const,
        label: tpl.name,
        hint: `${tpl.grid.length}×${tpl.grid[0]?.length || 0} · ${tpl.category}`,
        icon: <SearchIcon size={16} />,
        action: () => onNavigate(`template/${tpl.id}`),
        keywords: tpl.tags.join(' '),
      }));

    const matchedBase = baseCommands.filter(c =>
      c.label.toLowerCase().includes(q) ||
      (c.keywords || '').toLowerCase().includes(q)
    );

    return [...matchedBase, ...matchedTemplates];
  }, [query, baseCommands, templates, onNavigate]);

  // 重置选中
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // 打开时聚焦输入框
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // 关闭时清空
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  // ESC 关闭 / 上下键 / Enter
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filteredCommands.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = filteredCommands[activeIndex];
      if (cmd) {
        cmd.action();
        onClose();
      }
      return;
    }
  }, [filteredCommands, activeIndex, onClose]);

  // 滚动激活项到可视区
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const item = list.children[activeIndex] as HTMLElement | undefined;
    if (item) item.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  // 模板搜索（当输入无命令匹配时，提供"搜索 X"入口跳到首页搜索）
  const searchEntry: Command | null = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    // 若已有过滤命令，不显示
    if (filteredCommands.length > 0) return null;
    return {
      id: 'search-global',
      type: 'action',
      label: t('cmd.searchFor', { q }),
      hint: t('cmd.hint.search'),
      icon: <SearchIcon size={16} />,
      action: () => { onSearch(q); onNavigate('/'); },
    };
  }, [query, filteredCommands.length, t, onSearch, onNavigate]);

  const allCommands = searchEntry ? [searchEntry] : filteredCommands;

  if (!open) return null;

  return (
    <div
      className="cmd-palette-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t('cmd.title')}
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="cmd-palette"
        onClick={e => e.stopPropagation()}
      >
        <div className="cmd-palette__input-wrap">
          <SearchIcon size={18} className="cmd-palette__input-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-palette__input"
            placeholder={t('cmd.placeholder')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label={t('cmd.placeholder')}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmd-palette-list"
            aria-autocomplete="list"
            autoComplete="off"
          />
          <button
            type="button"
            className="cmd-palette__close"
            onClick={onClose}
            aria-label={t('common.close')}
          >
            <X size={16} />
          </button>
        </div>

        <div
          id="cmd-palette-list"
          ref={listRef}
          className="cmd-palette__list"
          role="listbox"
        >
          {allCommands.length === 0 ? (
            <div className="cmd-palette__empty">{t('cmd.empty')}</div>
          ) : (
            allCommands.map((cmd, i) => (
              <button
                key={cmd.id}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                className={`cmd-palette__item ${i === activeIndex ? 'cmd-palette__item--active' : ''}`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => { cmd.action(); onClose(); }}
              >
                <span className="cmd-palette__item-icon" aria-hidden="true">{cmd.icon}</span>
                <span className="cmd-palette__item-label">{cmd.label}</span>
                {cmd.hint && <span className="cmd-palette__item-hint">{cmd.hint}</span>}
                {i === activeIndex && (
                  <CornerDownLeft size={14} className="cmd-palette__item-enter" aria-hidden="true" />
                )}
              </button>
            ))
          )}
        </div>

        <div className="cmd-palette__footer" aria-hidden="true">
          <span className="cmd-palette__kbd"><ChevronUp size={12} /><ChevronDown size={12} /></span>
          <span className="cmd-palette__footer-label">{t('cmd.kbd.nav')}</span>
          <span className="cmd-palette__kbd"><CornerDownLeft size={12} /></span>
          <span className="cmd-palette__footer-label">{t('cmd.kbd.select')}</span>
          <span className="cmd-palette__kbd">ESC</span>
          <span className="cmd-palette__footer-label">{t('cmd.kbd.close')}</span>
        </div>
      </div>
    </div>
  );
}
