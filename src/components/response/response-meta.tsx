import { Clock, FileText, Layers } from 'lucide-react';
import { HttpResponse } from '../../utils/http';
import { StatusBadge } from '../ui/status-badge';

interface ResponseMetaProps {
  response: HttpResponse;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const formatTime = (ms: number) => {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
};

export const ResponseMeta = ({ response }: ResponseMetaProps) => {
  const headerCount = Object.keys(response.headers).length;

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 border-b border-border bg-bg-secondary">
      <StatusBadge status={response.status} />
      <div className="flex items-center gap-4 text-xs">
        <Stat icon={<Clock className="w-3.5 h-3.5" />} value={formatTime(response.time)} />
        <Stat icon={<FileText className="w-3.5 h-3.5" />} value={formatSize(response.size)} />
        <Stat
          icon={<Layers className="w-3.5 h-3.5" />}
          value={`${headerCount} ${headerCount === 1 ? 'header' : 'headers'}`}
        />
      </div>
    </div>
  );
};

const Stat = ({ icon, value }: { icon: React.ReactNode; value: string }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-muted">{icon}</span>
    <span className="text-primary font-medium tabular-nums">{value}</span>
  </div>
);
