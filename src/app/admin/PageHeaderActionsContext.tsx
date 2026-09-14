"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Ctx = {
  actions: ReactNode;
  setActions: (node: ReactNode) => void;
};

const PageHeaderActionsContext = createContext<Ctx | null>(null);

export function PageHeaderActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode>(null);
  return (
    <PageHeaderActionsContext.Provider value={{ actions, setActions }}>
      {children}
    </PageHeaderActionsContext.Provider>
  );
}

export function usePageHeaderActionsContext() {
  const ctx = useContext(PageHeaderActionsContext);
  if (!ctx) {
    throw new Error("usePageHeaderActionsContext dev'essere usato dentro PageHeaderActionsProvider");
  }
  return ctx;
}
