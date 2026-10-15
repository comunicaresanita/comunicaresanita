import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Warns before leaving a page with unsaved changes: browser close/reload,
 * in-app link clicks and the back button. Works with the non-data BrowserRouter.
 */
export function useUnsavedChangesGuard(dirty: boolean, onSave: () => Promise<boolean>) {
  const navigate = useNavigate();
  const [pending, setPending] = useState<null | (() => void)>(null);
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    const onClick = (e: MouseEvent) => {
      if (!dirtyRef.current || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey) return;
      const a = (e.target as HTMLElement)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      e.preventDefault();
      e.stopPropagation();
      setPending(() => () => navigate(url.pathname + url.search + url.hash));
    };
    // Back button: push a guard entry so "back" first lands here
    window.history.pushState({ unsavedGuard: true }, "");
    const onPop = () => {
      if (!dirtyRef.current) return;
      window.history.pushState({ unsavedGuard: true }, "");
      setPending(() => () => { dirtyRef.current = false; window.history.go(-2); });
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
    };
  }, [dirty, navigate]);

  /** Use for programmatic navigation (e.g. "Torna indietro" buttons). */
  const guard = (go: () => void) => (dirtyRef.current ? setPending(() => go) : go());

  const proceed = () => { const go = pending; setPending(null); dirtyRef.current = false; setTimeout(() => go?.(), 0); };

  const dialog = (
    <AlertDialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Modifiche non salvate</AlertDialogTitle>
          <AlertDialogDescription>
            Hai modificato dei dati senza salvarli. Vuoi salvarli prima di lasciare la pagina?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel>Resta sulla pagina</AlertDialogCancel>
          <Button variant="outline" onClick={proceed}>Annulla le modifiche</Button>
          <AlertDialogAction onClick={async (e) => { e.preventDefault(); if (await onSave()) proceed(); else setPending(null); }}>
            Salva ed esci
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { guard, dialog };
}
