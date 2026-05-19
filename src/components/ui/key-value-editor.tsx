'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Button } from './button';
import { Input } from './input';
import { cn } from '../../utils/cn';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

interface KeyValueEditorProps {
  items: KeyValuePair[];
  onChange: (items: KeyValuePair[]) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  className?: string;
  enableAutocomplete?: boolean;
  suggestions?: string[];
}

const COMMON_HTTP_HEADERS = [
  'Accept',
  'Accept-Charset',
  'Accept-Encoding',
  'Accept-Language',
  'Authorization',
  'Cache-Control',
  'Content-Type',
  'Content-Length',
  'Content-Encoding',
  'Content-Disposition',
  'Cookie',
  'Date',
  'ETag',
  'Expires',
  'If-Match',
  'If-None-Match',
  'If-Modified-Since',
  'If-Unmodified-Since',
  'Last-Modified',
  'Location',
  'Origin',
  'Referer',
  'User-Agent',
  'X-Requested-With',
  'X-API-Key',
  'X-API-Version',
  'X-Client-ID',
  'X-Client-Secret',
  'X-Correlation-ID',
  'X-Forwarded-For',
  'X-Forwarded-Proto',
  'X-Forwarded-Host',
  'X-Real-IP',
  'X-Request-ID',
  'X-Trace-ID',
  'X-Idempotency-Key',
  'X-Rate-Limit-Limit',
  'X-Rate-Limit-Remaining',
  'X-Rate-Limit-Reset',
  'X-ID-Key'
];

const COMMON_QUERY_PARAMS = [
  'page',
  'limit',
  'offset',
  'per_page',
  'size',
  'sort',
  'order',
  'order_by',
  'filter',
  'search',
  'q',
  'query',
  'include',
  'fields',
  'expand',
  'select',
  'exclude',
  'format',
  'callback',
  'embed',
  'count',
  'skip',
  'take',
  'top',
  'from',
  'to',
  'since',
  'until',
  'before',
  'after',
  'id',
  'ids',
  'status',
  'type',
  'category',
  'tag',
  'tags',
  'author',
  'published',
  'created_at',
  'updated_at',
  'deleted_at',
  'api_key',
  'api_token',
  'access_token',
  'token',
  'key',
  'secret',
];

export const KeyValueEditor = ({
  items,
  onChange,
  onFocus,
  onBlur,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  className,
  enableAutocomplete = false,
  suggestions = [],
}: KeyValueEditorProps) => {
  const [activeAutocomplete, setActiveAutocomplete] = useState<string | null>(null);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRefs = useRef<Record<string, HTMLInputElement>>({});
  const suggestionRefs = useRef<Record<string, HTMLDivElement>>({});

  const isHeaderEditor = keyPlaceholder?.toLowerCase().includes('header') ?? false;
  const isParamEditor = keyPlaceholder?.toLowerCase().includes('param') ?? false;
  
  const allSuggestions = enableAutocomplete 
    ? [...new Set([
        ...(isHeaderEditor ? COMMON_HTTP_HEADERS : []),
        ...(isParamEditor ? COMMON_QUERY_PARAMS : []),
        ...suggestions, 
        ...items.map(i => i.key).filter(Boolean)
      ])]
    : [];

  const updateItem = (id: string, updates: Partial<KeyValuePair>) => {
    onChange(
      items.map((item) => (item.id === id ? { ...item, ...updates } : item))
    );
  };

  const addItem = () => {
    onChange([
      ...items,
      {
        id: Date.now().toString(),
        key: '',
        value: '',
        enabled: true,
      },
    ]);
  };

  const removeItem = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
    if (activeAutocomplete === id) {
      setActiveAutocomplete(null);
    }
  };

  const handleKeyInput = (id: string, value: string) => {
    updateItem(id, { key: value });
    
    if (enableAutocomplete && value) {
      const filtered = allSuggestions.filter(s => 
        s.toLowerCase().includes(value.toLowerCase()) && 
        s.toLowerCase() !== value.toLowerCase()
      );
      setFilteredSuggestions(filtered.slice(0, 10));
      setSelectedIndex(0);
      setActiveAutocomplete(id);
    } else {
      setActiveAutocomplete(null);
    }
  };

  const handleKeyDown = (id: string, e: KeyboardEvent<HTMLInputElement>) => {
    if (!enableAutocomplete || activeAutocomplete !== id || filteredSuggestions.length === 0) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
    } else if (e.key === 'Enter' && filteredSuggestions[selectedIndex]) {
      e.preventDefault();
      updateItem(id, { key: filteredSuggestions[selectedIndex] });
      setActiveAutocomplete(null);
      inputRefs.current[id]?.blur();
    } else if (e.key === 'Escape') {
      setActiveAutocomplete(null);
    }
  };

  const selectSuggestion = (id: string, suggestion: string) => {
    updateItem(id, { key: suggestion });
    setActiveAutocomplete(null);
    inputRefs.current[id]?.focus();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeAutocomplete) {
        const input = inputRefs.current[activeAutocomplete];
        const suggestion = suggestionRefs.current[activeAutocomplete];
        if (input && suggestion && 
            !input.contains(e.target as Node) && 
            !suggestion.contains(e.target as Node)) {
          setActiveAutocomplete(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeAutocomplete]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center text-xs font-medium text-muted pb-2 border-b border-border">
        <div>{keyPlaceholder}</div>
        <div>{valuePlaceholder}</div>
        <div className="text-center px-1">On</div>
        <div className="w-7"></div>
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center relative"
        >
          <div className="relative">
            <Input
              ref={(el) => {
                if (el) inputRefs.current[item.id] = el;
              }}
              value={item.key}
              onChange={(e) => handleKeyInput(item.id, e.target.value)}
              onKeyDown={(e) => handleKeyDown(item.id, e)}
              onFocus={() => {
                onFocus?.();
                if (enableAutocomplete && item.key) {
                  const filtered = allSuggestions.filter(s => 
                    s.toLowerCase().includes(item.key.toLowerCase()) && 
                    s.toLowerCase() !== item.key.toLowerCase()
                  );
                  setFilteredSuggestions(filtered.slice(0, 10));
                  setActiveAutocomplete(item.id);
                }
              }}
              onBlur={onBlur}
              placeholder={keyPlaceholder}
              className="text-sm"
            />
            {enableAutocomplete && activeAutocomplete === item.id && filteredSuggestions.length > 0 && (
              <div
                ref={(el) => {
                  if (el) suggestionRefs.current[item.id] = el;
                }}
                className="absolute z-50 top-full mt-1 left-0 right-0 bg-bg border border-border rounded-md shadow-lg max-h-48 overflow-auto"
              >
                {filteredSuggestions.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => selectSuggestion(item.id, suggestion)}
                    className={cn(
                      "w-full px-3 py-1.5 text-left text-sm hover:bg-bg-secondary transition-colors",
                      index === selectedIndex && "bg-bg-secondary"
                    )}
                  >
                    <div className="text-primary font-mono">{suggestion}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Input
            value={item.value}
            onChange={(e) => updateItem(item.id, { value: e.target.value })}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={valuePlaceholder}
            className="text-sm"
          />
          <div className="flex justify-center">
            <input
              type="checkbox"
              checked={item.enabled}
              onChange={(e) =>
                updateItem(item.id, { enabled: e.target.checked })
              }
              className="w-4 h-4 accent-[rgb(var(--accent))] cursor-pointer"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeItem(item.id)}
            className="w-8 h-8 p-0"
            aria-label="Remove row"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline pt-1"
      >
        <Plus className="w-3.5 h-3.5" />
        Add row
      </button>
    </div>
  );
};

