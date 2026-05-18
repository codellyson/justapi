'use client';

import { useMemo, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { useRequestStore } from '../../stores/use-request-store';
import { useEnvironmentStore } from '../../stores/use-environment-store';
import { replaceVariables } from '../../utils/variables';
import { snippetGenerators, type SnippetLang } from '../../utils/snippets';
import { Modal } from '../ui/modal';
import { Button } from '../ui/button';
import { CodeEditor } from '../ui/code-editor';
import { cn } from '../../utils/cn';

interface SnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LANGS: { id: SnippetLang; label: string }[] = [
  { id: 'curl', label: 'cURL' },
  { id: 'fetch', label: 'fetch' },
  { id: 'axios', label: 'axios' },
];

export const SnippetModal = ({ isOpen, onClose }: SnippetModalProps) => {
  const {
    method,
    url,
    params,
    headers,
    body,
    bodyType,
    authType,
    authConfig,
  } = useRequestStore();
  const { getVariables } = useEnvironmentStore();
  const [lang, setLang] = useState<SnippetLang>('curl');
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    if (!isOpen) return '';
    const variables = getVariables();

    let fullUrl = replaceVariables(url, variables);
    const enabledParams = params.filter((p) => p.enabled && p.key);
    if (enabledParams.length > 0) {
      const sp = new URLSearchParams();
      enabledParams.forEach((p) =>
        sp.append(p.key, replaceVariables(p.value, variables))
      );
      const qs = sp.toString();
      if (qs) fullUrl += (fullUrl.includes('?') ? '&' : '?') + qs;
    }

    const finalHeaders: Record<string, string> = {};
    headers
      .filter((h) => h.enabled && h.key)
      .forEach((h) => {
        finalHeaders[h.key] = replaceVariables(h.value, variables);
      });

    if (authType === 'bearer' && authConfig.bearerToken) {
      finalHeaders['Authorization'] = `Bearer ${authConfig.bearerToken}`;
    } else if (authType === 'basic' && authConfig.username) {
      const creds = btoa(`${authConfig.username}:${authConfig.password || ''}`);
      finalHeaders['Authorization'] = `Basic ${creds}`;
    } else if (
      authType === 'api-key' &&
      authConfig.apiKey &&
      authConfig.apiKeyHeader
    ) {
      finalHeaders[authConfig.apiKeyHeader] = authConfig.apiKey;
    }

    if (bodyType === 'json' && body && !finalHeaders['Content-Type']) {
      finalHeaders['Content-Type'] = 'application/json';
    }

    const reqBody =
      bodyType === 'json' || bodyType === 'raw' ? body : undefined;

    return snippetGenerators[lang]({
      method,
      url: fullUrl,
      headers: finalHeaders,
      body: reqBody,
    });
  }, [isOpen, lang, method, url, params, headers, body, bodyType, authType, authConfig, getVariables]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Code" size="lg">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex border border-border rounded-md overflow-hidden">
            {LANGS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLang(l.id)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-colors',
                  lang === l.id
                    ? 'bg-accent text-white'
                    : 'bg-bg text-secondary hover:text-primary'
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          <Button variant="secondary" size="sm" onClick={handleCopy}>
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </Button>
        </div>
        <CodeEditor
          value={code}
          language={lang === 'curl' ? 'bash' : 'javascript'}
          readOnly
          height="60vh"
        />
      </div>
    </Modal>
  );
};
