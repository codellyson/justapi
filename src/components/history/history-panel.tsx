'use client';

import { useHistoryStore } from '../../stores/use-history-store';
import { useRequestStore } from '../../stores/use-request-store';
import { useDebuggerStore } from '../../stores/use-debugger-store';
import { HistoryItem as HistoryItemComponent } from './history-item';
import { Button } from '../ui/button';
import { Trash2, Clock } from 'lucide-react';
import { HttpMethod } from '../../utils/http';

export const HistoryPanel = () => {
  const { items, clearAll } = useHistoryStore();
  const { setMethod, setUrl } = useRequestStore();

  const handleItemClick = (item: { method: HttpMethod; url: string }) => {
    useDebuggerStore.getState().setSelected(null);
    useDebuggerStore.getState().setReplayOriginal(null);
    setMethod(item.method as HttpMethod);
    setUrl(item.url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-secondary">
            Recent requests
          </h3>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Clock className="w-10 h-10 text-muted mb-3" />
            <h3 className="text-sm font-medium text-primary mb-1">
              No history yet
            </h3>
            <p className="text-xs text-secondary max-w-[200px]">
              Your request history will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {items.map((item) => (
              <HistoryItemComponent
                key={item.id}
                item={item}
                onClick={() => handleItemClick(item)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

