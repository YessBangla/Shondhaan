import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from "react";

export type BackendPageMeta = {
  /** Optional override for the page title (defaults to current nav label) */
  title?: ReactNode;
  /** Optional kicker / breadcrumb override */
  eyebrow?: ReactNode;
  /** Optional descriptive subtitle below the title */
  description?: ReactNode;
  /** Primary actions (rendered on the right, prominent) */
  primary?: ReactNode;
  /** Secondary actions (rendered to the left of primary, lighter) */
  secondary?: ReactNode;
  /** Filters / toolbar bar shown directly under the header */
  toolbar?: ReactNode;
};

type Ctx = {
  meta: BackendPageMeta;
  setMeta: (m: BackendPageMeta) => void;
  clearMeta: () => void;
};

const BackendPageActionsContext = createContext<Ctx | null>(null);

export const BackendPageActionsProvider = ({ children }: { children: ReactNode }) => {
  const [meta, setMetaState] = useState<BackendPageMeta>({});
  const value = useMemo<Ctx>(() => ({
    meta,
    setMeta: (m) => setMetaState(m),
    clearMeta: () => setMetaState({}),
  }), [meta]);
  return (
    <BackendPageActionsContext.Provider value={value}>{children}</BackendPageActionsContext.Provider>
  );
};

/**
 * Read-only access to the current page's header meta.
 * Used by the layout to render the page header.
 */
export const useBackendPageMeta = () => {
  const ctx = useContext(BackendPageActionsContext);
  return ctx?.meta ?? {};
};

/**
 * Register page-level header content (title, actions, toolbar).
 * Pass `null`/`undefined` props to omit a slot.
 * Auto-clears on unmount or when deps change.
 *
 * Usage in any backend page:
 *   useBackendPageActions({
 *     primary: <Button onClick={save}>সংরক্ষণ</Button>,
 *     secondary: <Button variant="outline" onClick={exportCsv}>এক্সপোর্ট</Button>,
 *     toolbar: <Filters />,
 *   });
 */
export const useBackendPageActions = (meta: BackendPageMeta, deps: unknown[] = []) => {
  const ctx = useContext(BackendPageActionsContext);
  useEffect(() => {
    if (!ctx) return;
    ctx.setMeta(meta);
    return () => ctx.clearMeta();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};