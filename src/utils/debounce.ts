
export function debounce<F extends (...args: any[]) => void>(func: F, waitFor: number) {
  let timeout: NodeJS.Timeout;

  const debounced = (...args: Parameters<F>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };

  debounced.cancel = () => {
    clearTimeout(timeout);
  };

  return debounced;
}
