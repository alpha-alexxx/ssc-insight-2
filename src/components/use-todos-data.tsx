"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api-client";

type Entry = { value?: unknown; promise?: Promise<unknown> };
type Store = { entries: Map<string, Entry>; listeners: Set<() => void> };
const Context = createContext<Store | null>(null);

/** Shell lifetime query cache. Keys include every filter and calendar range. */
export function TodosDataProvider({ children }: { children: ReactNode }) {
  const [store] = useState<Store>(() => ({
    entries: new Map(),
    listeners: new Set(),
  }));
  useEffect(() => {
    const invalidate = () => {
      store.entries.clear();
      store.listeners.forEach((listener) => listener());
    };
    window.addEventListener("ssc:todos-changed", invalidate);
    return () => {
      window.removeEventListener("ssc:todos-changed", invalidate);
      store.entries.clear();
    };
  }, [store]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}

export function useTodoQuery<T>(path: string) {
  const store = useContext(Context);
  if (!store) throw new Error("Personal tasks require the workspace provider.");
  const [state, setState] = useState<{
    key: string;
    data?: T;
    error: string;
    loading: boolean;
  }>({ key: path, error: "", loading: true });
  const request = useRef(0);
  const [retry, setRetry] = useState(0);
  const refresh = useCallback(() => {
    store.entries.delete(path);
    setRetry((value) => value + 1);
  }, [path, store]);
  useEffect(() => {
    let alive = true;
    const load = () => {
      const revision = ++request.current;
      let entry = store.entries.get(path);
      if (!entry) {
        entry = {};
        const current = entry;
        current.promise = api<T>(path)
          .then((value) => {
            current.value = value;
            return value;
          })
          .catch((error: unknown) => {
            if (store.entries.get(path) === current) store.entries.delete(path);
            throw error;
          });
        store.entries.set(path, current);
      }
      const current = entry;
      void (
        current.value !== undefined
          ? Promise.resolve(current.value)
          : current.promise!
      )
        .then((data) => {
          if (
            alive &&
            revision === request.current &&
            store.entries.get(path) === current
          )
            setState({ key: path, data: data as T, error: "", loading: false });
        })
        .catch((error: unknown) => {
          if (alive && revision === request.current)
            setState({
              key: path,
              error:
                error instanceof Error
                  ? error.message
                  : "Could not load tasks.",
              loading: false,
            });
        });
    };
    load();
    store.listeners.add(load);
    return () => {
      alive = false;
      store.listeners.delete(load);
    };
  }, [path, store, retry]);
  return {
    data: state.key === path ? state.data : undefined,
    error: state.key === path ? state.error : "",
    loading: state.key !== path || state.loading,
    refresh,
  };
}

export async function mutateTodoRequest(
  path: string,
  method: string,
  body?: unknown,
) {
  const result = await api(path, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  window.dispatchEvent(new Event("ssc:todos-changed"));
  return result;
}
