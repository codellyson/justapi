'use client';

import { HttpResponse } from '../../utils/http';
import { Copy } from 'lucide-react';
import { Button } from '../ui/button';

interface ResponseHeadersProps {
  response: HttpResponse;
}

export const ResponseHeaders = ({ response }: ResponseHeadersProps) => {
  const handleCopy = async (key: string, value: string) => {
    await navigator.clipboard.writeText(`${key}: ${value}`);
  };

  return (
    <div className="px-3 py-3">
      <div className="space-y-1">
        {Object.entries(response.headers).map(([key, value]) => (
          <div
            key={key}
            className="flex items-start gap-2 p-2 rounded-md hover:bg-bg-secondary group"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-primary font-mono">{key}</div>
              <div className="text-sm text-secondary break-all font-mono">{value}</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCopy(key, value)}
              className="w-7 h-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Copy header"
            >
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
