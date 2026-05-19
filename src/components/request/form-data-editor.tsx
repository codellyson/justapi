'use client';

import { useRef } from 'react';
import { Plus, Trash2, FileUp, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../utils/cn';
import type { FormDataPair } from '../../utils/form-data';

interface FormDataEditorProps {
  items: FormDataPair[];
  onChange: (items: FormDataPair[]) => void;
  className?: string;
}

const newRow = (): FormDataPair => ({
  id: String(Date.now() + Math.random()),
  key: '',
  value: '',
  enabled: true,
  type: 'text',
});

export const FormDataEditor = ({
  items,
  onChange,
  className,
}: FormDataEditorProps) => {
  const update = (id: string, patch: Partial<FormDataPair>) =>
    onChange(items.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const remove = (id: string) => onChange(items.filter((it) => it.id !== id));

  const add = () => onChange([...items, newRow()]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid grid-cols-[1fr_1fr_90px_auto_auto] gap-2 items-center text-xs font-medium text-muted pb-2 border-b border-border">
        <div>Field name</div>
        <div>Value</div>
        <div>Type</div>
        <div className="text-center px-1">On</div>
        <div className="w-8" />
      </div>
      {items.map((item) => (
        <Row
          key={item.id}
          item={item}
          onChange={(patch) => update(item.id, patch)}
          onRemove={() => remove(item.id)}
        />
      ))}
      <button
        onClick={add}
        className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline pt-1"
      >
        <Plus className="w-3.5 h-3.5" />
        Add row
      </button>
    </div>
  );
};

const Row = ({
  item,
  onChange,
  onRemove,
}: {
  item: FormDataPair;
  onChange: (patch: Partial<FormDataPair>) => void;
  onRemove: () => void;
}) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const pickFile = () => fileRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onChange({ file, value: file.name });
  };

  const clearFile = () => onChange({ file: undefined, value: '' });

  return (
    <div className="grid grid-cols-[1fr_1fr_90px_auto_auto] gap-2 items-center">
      <Input
        value={item.key}
        onChange={(e) => onChange({ key: e.target.value })}
        placeholder="Field name"
        className="text-sm"
      />
      {item.type === 'text' ? (
        <Input
          value={item.value}
          onChange={(e) => onChange({ value: e.target.value })}
          placeholder="Value"
          className="text-sm"
        />
      ) : (
        <div className="flex items-center gap-1 min-w-0">
          <input
            ref={fileRef}
            type="file"
            onChange={onFile}
            className="hidden"
          />
          {item.file ? (
            <>
              <span
                className="flex-1 truncate text-xs text-primary font-mono px-2 py-1.5 border border-border rounded-md bg-bg-secondary"
                title={`${item.file.name} (${item.file.size} bytes)`}
              >
                {item.file.name}
              </span>
              <button
                onClick={clearFile}
                className="p-1 text-muted hover:text-danger"
                aria-label="Clear file"
                title="Clear file"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={pickFile} className="w-full">
              <FileUp className="w-3.5 h-3.5" />
              Choose file
            </Button>
          )}
        </div>
      )}
      <select
        value={item.type}
        onChange={(e) =>
          onChange({
            type: e.target.value as 'text' | 'file',
            // Clear file payload when switching back to text.
            file: e.target.value === 'text' ? undefined : item.file,
            value: e.target.value === 'text' ? item.value : item.file?.name || '',
          })
        }
        className="text-xs rounded-md border border-border bg-bg text-primary px-1.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent"
      >
        <option value="text">Text</option>
        <option value="file">File</option>
      </select>
      <div className="flex justify-center">
        <input
          type="checkbox"
          checked={item.enabled}
          onChange={(e) => onChange({ enabled: e.target.checked })}
          className="w-4 h-4 accent-[rgb(var(--accent))] cursor-pointer"
          aria-label="Enabled"
        />
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="w-8 h-8 p-0"
        aria-label="Remove row"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
};
