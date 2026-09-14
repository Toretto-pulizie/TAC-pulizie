"use client";

import { useEffect, type ReactNode } from "react";
import { usePageHeaderActionsContext } from "./PageHeaderActionsContext";

// Fa comparire i suoi children nel box condiviso in alto (accanto al
// titolo), invece che nel corpo della pagina — usato per i pulsanti "azione
// principale" di una pagina (es. "+ Nuovo cliente"). Registra i children una
// sola volta al montaggio: pensato per contenuto statico per pagina, non per
// azioni che cambiano in base allo stato interno della pagina.
export function PageHeaderActions({ children }: { children: ReactNode }) {
  const { setActions } = usePageHeaderActionsContext();

  useEffect(() => {
    setActions(children);
    return () => setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
