import React, { useState, useRef, useEffect } from 'react';
import { TagCode } from '../types';
import { TAGS_CONFIG, TAG_CODES_ORDER } from '../constants/config';

interface TagPickerProps {
  currentTag: TagCode;
  onSelect: (tag: TagCode) => void;
  disabledCodes?: TagCode[];
  hideSleepTag?: boolean;
  small?: boolean;
  emptyTitle?: string;
  buttonId?: string;
  lang: 'ar' | 'en';
}

export const TagPicker: React.FC<TagPickerProps> = ({
  currentTag,
  onSelect,
  disabledCodes = [],
  hideSleepTag = false,
  small = false,
  emptyTitle,
  buttonId,
  lang
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement>(null);

  const tagInfo = TAGS_CONFIG[currentTag] || TAGS_CONFIG[''];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus the active or first tag button in the menu
      setTimeout(() => {
        if (activeBtnRef.current) {
          activeBtnRef.current.focus();
        } else if (menuRef.current) {
          const firstBtn = menuRef.current.querySelector('button:not(:disabled)') as HTMLButtonElement | null;
          firstBtn?.focus();
        }
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (code: TagCode) => {
    onSelect(code);
    setIsOpen(false);
  };

  const handleKeyDownMenu = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      const triggerBtn = buttonId ? document.getElementById(buttonId) : null;
      triggerBtn?.focus();
    }
  };

  const codesToRender = TAG_CODES_ORDER.filter((code) => !hideSleepTag || code !== 'SL');

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        id={buttonId}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title={currentTag ? tagInfo.desc[lang] : emptyTitle || tagInfo.desc[lang]}
        className={`font-semibold transition-all duration-150 rounded-md border flex items-center justify-center select-none shadow-xs cursor-pointer ${
          small
            ? 'h-6 px-1.5 min-w-[34px] text-[10px]'
            : 'h-6.5 px-2 min-w-[40px] text-xs'
        }`}
        style={{
          backgroundColor: currentTag ? tagInfo.bgTint : 'var(--card)',
          color: currentTag ? tagInfo.color : 'var(--ink-faint)',
          borderColor: currentTag ? tagInfo.color : 'var(--line)'
        }}
      >
        {currentTag || '—'}
      </button>

      {isOpen && (
        <div
          ref={menuRef}
          onKeyDown={handleKeyDownMenu}
          className={`absolute top-full z-50 mt-1.5 p-1.5 bg-[var(--card)] border border-[var(--line)] rounded-xl shadow-xl flex items-center gap-1 min-w-max animate-in fade-in zoom-in-95 duration-100 ${
            lang === 'ar' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'
          }`}
          style={{
            direction: lang === 'ar' ? 'rtl' : 'ltr'
          }}
        >
          {codesToRender.map((code) => {
            const info = TAGS_CONFIG[code];
            const isDisabled = code !== '' && disabledCodes.includes(code);
            const isSelected = currentTag === code;

            return (
              <button
                key={code || 'none'}
                ref={isSelected ? activeBtnRef : undefined}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelect(code)}
                title={
                  isDisabled
                    ? lang === 'ar'
                      ? 'متاح فقط في ساعات الليل (١٠م - ٦ص)'
                      : 'Only available in night hours (10pm - 6am)'
                    : info.fullTitle[lang]
                }
                className={`h-7 min-w-[28px] px-1.5 text-xs font-bold rounded-lg border transition-all text-center flex items-center justify-center shrink-0 ${
                  isDisabled
                    ? 'opacity-30 cursor-not-allowed border-dashed border-[var(--line)] bg-[var(--bg)]'
                    : isSelected
                    ? 'ring-2 ring-indigo-500 font-bold scale-105'
                    : 'hover:scale-105 active:scale-95 cursor-pointer'
                }`}
                style={{
                  backgroundColor: info.bgTint,
                  color: info.color,
                  borderColor: isSelected ? info.color : 'var(--line)'
                }}
              >
                {code || '—'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
