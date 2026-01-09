"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

interface ShelfLoadingContextValue {
  isLoading: boolean;
  loadingMessage: string | null;
  startLoading: (message?: string) => void;
  stopLoading: () => void;
  withLoading: <T>(
    action: () => Promise<T>,
    message?: string
  ) => Promise<T>;
}

const ShelfLoadingContext = createContext<ShelfLoadingContextValue | null>(null);

export function ShelfLoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const startLoading = useCallback((message?: string) => {
    setIsLoading(true);
    setLoadingMessage(message ?? null);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
    setLoadingMessage(null);
  }, []);

  const withLoading = useCallback(
    async <T,>(action: () => Promise<T>, message?: string): Promise<T> => {
      startLoading(message);
      try {
        return await action();
      } finally {
        stopLoading();
      }
    },
    [startLoading, stopLoading]
  );

  return (
    <ShelfLoadingContext.Provider
      value={{ isLoading, loadingMessage, startLoading, stopLoading, withLoading }}
    >
      {children}
    </ShelfLoadingContext.Provider>
  );
}

export function useShelfLoading() {
  const context = useContext(ShelfLoadingContext);
  if (!context) {
    throw new Error("useShelfLoading must be used within ShelfLoadingProvider");
  }
  return context;
}

/**
 * Optional hook - returns null if used outside provider (safe for server components)
 */
export function useShelfLoadingOptional() {
  return useContext(ShelfLoadingContext);
}

