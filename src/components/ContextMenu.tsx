import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

export type ContextMenuItem = {
  id: string;
  label: string;
  checked?: boolean;
  onSelect: () => void;
};

export type ContextMenuGroup = {
  id: string;
  label?: string;
  items: ContextMenuItem[];
};

interface ContextMenuProps {
  open: boolean;
  x: number;
  y: number;
  label: string;
  groups: ContextMenuGroup[];
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  open,
  x,
  y,
  label,
  groups,
  onClose
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    if (!open || !menuRef.current) {
      setCoords({ left: x, top: y });
      return;
    }
    const rect = menuRef.current.getBoundingClientRect();
    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - rect.height - margin);
    setCoords({
      left: Math.min(Math.max(margin, x), maxLeft),
      top: Math.min(Math.max(margin, y), maxTop)
    });
  }, [groups, open, x, y]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [onClose, open]);

  useEffect(() => {
    if (!open) return;
    const first = menuRef.current?.querySelector<HTMLElement>("[role='menuitem'], [role='menuitemradio']");
    first?.focus();
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={label}
      data-context-menu="true"
      style={{ left: coords.left, top: coords.top }}
      className="fixed z-[80] min-w-48 max-w-xs rounded-lg border border-theme bg-surface p-1 shadow-card"
    >
      {groups.map((group, index) => (
        <div
          key={group.id}
          role="group"
          aria-label={group.label}
          className={index > 0 ? "mt-1 border-t border-theme pt-1" : ""}
        >
          {group.label && (
            <p className="px-2.5 py-1 text-dynamic-xs font-semibold text-muted">{group.label}</p>
          )}
          {group.items.map((item) => (
            <button
              key={item.id}
              type="button"
              role={item.checked === undefined ? "menuitem" : "menuitemradio"}
              aria-checked={item.checked}
              onClick={() => {
                item.onSelect();
                onClose();
              }}
              className="flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-start text-dynamic-sm text-foreground hover:bg-surface-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <span>{item.label}</span>
              {item.checked ? <Check className="h-3.5 w-3.5 text-primary-text" aria-hidden="true" /> : null}
            </button>
          ))}
        </div>
      ))}
    </div>,
    document.body
  );
};
