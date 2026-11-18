export const runAfterFrame = (callback) => {
  let cancelled = false;
  let timerId = null;

  const rafId = requestAnimationFrame(() => {
    timerId = setTimeout(() => {
      if (!cancelled) {
        callback();
      }
    }, 0);
  });

  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
    if (timerId !== null) {
      clearTimeout(timerId);
    }
  };
};
