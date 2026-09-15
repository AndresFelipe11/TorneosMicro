"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

const ConfirmContext = createContext<(options: ConfirmOptions) => Promise<boolean>>(async () => false);

export function useAskConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const ask = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({ ...options, resolve });
    });
  }, []);

  function close(ok: boolean) {
    pending?.resolve(ok);
    setPending(null);
  }

  useEffect(() => {
    if (!pending) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending]);

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {pending ? (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center"
          role="presentation"
          onClick={() => close(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            className="card w-full max-w-md space-y-4 p-5"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="confirm-title" className="display text-2xl">
              {pending.title ?? "Confirmar"}
            </h2>
            <p id="confirm-message" className="whitespace-pre-line text-sm leading-6 text-cream/90">
              {pending.message}
            </p>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className="btn btn-ghost" onClick={() => close(false)}>
                {pending.cancelLabel ?? "Cancelar"}
              </button>
              <button
                type="button"
                className={pending.danger ? "btn bg-red-500 text-white" : "btn btn-lime"}
                autoFocus
                onClick={() => close(true)}
              >
                {pending.confirmLabel ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  );
}
