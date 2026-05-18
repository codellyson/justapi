export interface FormDataPair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  type: 'text' | 'file';
  file?: File;
}

export function hasEnabledFile(pairs: FormDataPair[]): boolean {
  return pairs.some((p) => p.enabled && p.type === 'file' && p.file);
}

export function buildMultipart(
  pairs: FormDataPair[],
  resolveText: (text: string) => string
): FormData {
  const fd = new FormData();
  pairs
    .filter((p) => p.enabled && p.key)
    .forEach((p) => {
      if (p.type === 'file' && p.file) {
        fd.append(p.key, p.file, p.file.name);
      } else if (p.type === 'text') {
        fd.append(p.key, resolveText(p.value));
      }
    });
  return fd;
}

export function buildUrlEncoded(
  pairs: FormDataPair[],
  resolveText: (text: string) => string
): string {
  const sp = new URLSearchParams();
  pairs
    .filter((p) => p.enabled && p.key && p.type === 'text')
    .forEach((p) => sp.append(p.key, resolveText(p.value)));
  return sp.toString();
}
