export const formatSize = (bytes: number): string => {
  const abs = Math.abs(bytes);
  if (abs < 1024) return `${bytes}B`;
  if (abs < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
};
