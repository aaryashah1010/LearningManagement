"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface ComboboxItem {
  id: number;
  label: string;
  sublabel?: string;
}

interface ComboboxProps {
  items: ComboboxItem[];
  value: number | null;
  onChange: (id: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onLoadMore: () => void;
  placeholder?: string;
  disabled?: boolean;
  // Label for the current value — passed separately because `items` is a
  // filtered/paginated window and may not contain the selected row.
  selectedLabel?: string | null;
  id?: string;
}

export function Combobox({
  items,
  value,
  onChange,
  search,
  onSearchChange,
  isLoading,
  isFetchingNextPage,
  hasNextPage,
  onLoadMore,
  placeholder = "Search…",
  disabled,
  selectedLabel,
  id,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // A small bounded panel like this listbox scrolls within itself, not the
  // page — a direct scroll-position check is simpler and more reliable here
  // than an IntersectionObserver against the viewport (used instead for
  // page-level infinite lists, see use-infinite-scroll-sentinel.ts).
  function handleListboxScroll(event: React.UIEvent<HTMLUListElement>) {
    if (!hasNextPage || isFetchingNextPage) return;
    const el = event.currentTarget;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 80) onLoadMore();
  }

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function openPanel() {
    if (disabled) return;
    setOpen(true);
    setHighlighted(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function selectItem(item: ComboboxItem) {
    onChange(item.id);
    setOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((i) => Math.min(i + 1, items.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const item = items[highlighted];
      if (item) selectItem(item);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      {open ? (
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-controls={listboxId}
          value={search}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setHighlighted(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full rounded-lg border-b-2 border-correct bg-transparent px-1 pb-2 text-sm text-ink focus:outline-none dark:text-paper"
        />
      ) : (
        <button
          type="button"
          id={id}
          onClick={openPanel}
          disabled={disabled}
          className="flex w-full items-center justify-between gap-2 rounded-lg border-b-2 border-ink/15 bg-transparent px-1 pb-2 text-left text-sm text-ink focus:border-correct focus:outline-none disabled:opacity-50 dark:border-paper/20 dark:text-paper"
        >
          <span className={selectedLabel ? "" : "text-ink/35 dark:text-paper/35"}>
            {selectedLabel ?? placeholder}
          </span>
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1 w-full overflow-hidden rounded-xl border border-ink/10 bg-paper shadow-lg dark:border-paper/15 dark:bg-slate">
          <ul
            id={listboxId}
            role="listbox"
            onScroll={handleListboxScroll}
            className="max-h-64 overflow-y-auto py-1"
          >
            {isLoading ? (
              <li className="px-3 py-2 text-sm text-ink/45 dark:text-paper/45">Loading…</li>
            ) : items.length === 0 ? (
              <li className="px-3 py-2 text-sm text-ink/45 dark:text-paper/45">No results.</li>
            ) : (
              items.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={item.id === value}
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={() => selectItem(item)}
                    className={`flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition-colors ${
                      index === highlighted
                        ? "bg-correct/10 text-ink dark:text-paper"
                        : "text-ink/80 dark:text-paper/80"
                    } ${item.id === value ? "font-medium" : ""}`}
                  >
                    <span>{item.label}</span>
                    {item.sublabel && (
                      <span className="font-utility text-[11px] text-ink/45 dark:text-paper/45">
                        {item.sublabel}
                      </span>
                    )}
                  </button>
                </li>
              ))
            )}
            {hasNextPage && isFetchingNextPage && (
              <li className="px-3 py-2 text-center font-utility text-[11px] text-ink/35 dark:text-paper/35">
                Loading more…
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
