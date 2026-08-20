"use client";

import {
  useRef,
  useState,
  type FocusEvent,
  type InputEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { EraserIcon, PencilIcon } from "@/components/icons";

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  index: number;
  label: string;
  helper?: string;
  rightSlot?: ReactNode;
  // Opt-in — a small pen/eraser that tracks the text caret as you type or
  // delete. Scoped to specific fields (the login page) rather than every
  // FormField, so it stays a deliberate touch rather than a global default.
  writingCursor?: boolean;
};

const DELETE_KEYS = new Set(["Backspace", "Delete"]);

export function FormField({
  index,
  label,
  helper,
  rightSlot,
  id,
  writingCursor = false,
  onKeyDown,
  onKeyUp,
  onInput,
  onFocus,
  onBlur,
  onClick,
  ...props
}: FormFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mirrorRef = useRef<HTMLSpanElement>(null);
  const [caretX, setCaretX] = useState(0);
  const [mode, setMode] = useState<"pen" | "eraser">("pen");
  const [focused, setFocused] = useState(false);

  function updateCaret() {
    const input = inputRef.current;
    const mirror = mirrorRef.current;
    if (!input || !mirror) return;
    const selectionStart = input.selectionStart ?? input.value.length;
    mirror.textContent = input.value.slice(0, selectionStart);
    setCaretX(mirror.getBoundingClientRect().width);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (writingCursor) setMode(DELETE_KEYS.has(event.key) ? "eraser" : "pen");
    onKeyDown?.(event);
  }

  function handleKeyUp(event: KeyboardEvent<HTMLInputElement>) {
    if (writingCursor) updateCaret();
    onKeyUp?.(event);
  }

  function handleInput(event: InputEvent<HTMLInputElement>) {
    if (writingCursor) updateCaret();
    onInput?.(event);
  }

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    if (writingCursor) {
      setFocused(true);
      updateCaret();
    }
    onFocus?.(event);
  }

  function handleBlur(event: FocusEvent<HTMLInputElement>) {
    if (writingCursor) setFocused(false);
    onBlur?.(event);
  }

  function handleClick(event: MouseEvent<HTMLInputElement>) {
    if (writingCursor) updateCaret();
    onClick?.(event);
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex items-baseline gap-2">
        <span className="font-utility text-[11px] font-medium text-mark">
          Q{index}
        </span>
        <span className="text-sm font-medium text-ink/80 dark:text-paper/80">{label}</span>
      </label>
      <div className="relative flex items-end gap-2 border-b-2 border-ink/15 pb-2 transition-colors focus-within:border-correct dark:border-paper/20">
        <input
          ref={inputRef}
          id={id}
          className="w-full bg-transparent font-body text-base text-ink placeholder:text-ink/35 focus:outline-none dark:text-paper dark:placeholder:text-paper/35"
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onInput={handleInput}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClick={handleClick}
          {...props}
        />
        {rightSlot}

        {writingCursor && (
          <>
            <span
              ref={mirrorRef}
              aria-hidden
              className="invisible absolute left-0 top-0 whitespace-pre font-body text-base"
            />
            <span
              aria-hidden
              className={`pointer-events-none absolute bottom-6 left-0 -ml-2 transition-[transform,opacity] duration-150 ease-out ${
                focused ? "opacity-100" : "opacity-0"
              }`}
              style={{ transform: `translateX(${caretX}px)` }}
            >
              {mode === "eraser" ? (
                <EraserIcon className="h-7 w-7 text-mark" />
              ) : (
                <PencilIcon className="h-7 w-7 text-correct" />
              )}
            </span>
          </>
        )}
      </div>
      {helper && (
        <p className="font-utility text-[11px] leading-relaxed text-ink/55 dark:text-paper/55">
          {helper}
        </p>
      )}
    </div>
  );
}
