/**
 * Performance timing utility for debugging
 * This is NOT a server action - just a utility function
 */
export function createTimer(label: string) {
  const start = performance.now();
  return {
    end: () => {
      const duration = Math.round(performance.now() - start);
      if (process.env.NODE_ENV === "development") {
        console.log(`[PERF] ${label}: ${duration}ms`);
      }
      return duration;
    },
  };
}

