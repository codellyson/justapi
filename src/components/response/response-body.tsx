'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { HttpResponse } from '../../utils/http';
import { CodeEditor } from '../ui/code-editor';
import { Button } from '../ui/button';

interface ResponseBodyProps {
  response: HttpResponse;
}

export const ResponseBody = ({ response }: ResponseBodyProps) => {
  const [copied, setCopied] = useState(false);

  const formatBody = () => {
    if (typeof response.data === 'string') {
      return response.data;
    }
    try {
      return JSON.stringify(response.data, null, 2);
    } catch {
      return String(response.data);
    }
  };

  const handleCopy = async () => {
    const text = formatBody();
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bodyText = formatBody();
  const isJson = typeof response.data === 'object' || (typeof bodyText === 'string' && bodyText.trim().startsWith('{'));

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center justify-end gap-2 p-2 border-b border-border shrink-0">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCopy}
        >
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
      <div className="flex-1 overflow-hidden min-h-0">
        <CodeEditor
          value={bodyText}
          language={isJson ? 'json' : 'text'}
          readOnly
          height="100%"
          className="border-0 rounded-none h-full"
        />
      </div>
    </div>
  );
};

