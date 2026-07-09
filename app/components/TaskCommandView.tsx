'use client';

import {
  getTicketId,
  statusLabel,
  statusTone,
  TaskCommandData,
  TaskComment,
  TaskTicket,
} from '@/lib/taskCommand';

interface TaskCommandViewProps {
  command: TaskCommandData;
  fallbackText?: string;
  onPrefillMessage?: (message: string) => void;
}

const toneClasses = {
  emerald: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50',
  amber: 'bg-amber-950/50 text-amber-300 border-amber-800/50',
  slate: 'bg-slate-800/80 text-slate-300 border-slate-600/50',
  indigo: 'bg-indigo-950/50 text-indigo-300 border-indigo-800/50',
} as const;

const StatusBadge = ({ status }: { status?: string }) => {
  const tone = statusTone(status);
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${toneClasses[tone]}`}>
      {statusLabel(status)}
    </span>
  );
};

const formatDate = (value?: string): string | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('az-AZ', { dateStyle: 'short', timeStyle: 'short' });
};

const TicketCard = ({
  ticket,
  onPrefillMessage,
  detailed = false,
}: {
  ticket: TaskTicket;
  onPrefillMessage?: (message: string) => void;
  detailed?: boolean;
}) => {
  const id = getTicketId(ticket);
  const title = ticket.title || ticket.description?.slice(0, 80) || 'Ticket';
  const description = ticket.description || ticket.title || '';
  const updated = formatDate(ticket.updated_at || ticket.created_at);

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-100 line-clamp-2">{title}</p>
          {ticket.category && (
            <p className="mt-1 text-xs text-amber-200/90">
              <span className="text-slate-500">Kateqoriya:</span> {ticket.category}
            </p>
          )}
        </div>
        <StatusBadge status={ticket.status} />
      </div>
      {detailed && description && (
        <p className="mt-2 text-sm text-slate-400 whitespace-pre-wrap">{description}</p>
      )}
      {!detailed && description && description !== title && (
        <p className="mt-2 text-xs text-slate-500 line-clamp-2">{description}</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {id && (
          <code className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-400 font-mono">
            {id.length > 20 ? `${id.slice(0, 8)}…${id.slice(-8)}` : id}
          </code>
        )}
        {updated && <span className="text-[10px] text-slate-600">{updated}</span>}
        {id && onPrefillMessage && (
          <button
            type="button"
            onClick={() => onPrefillMessage(`/taskstatus ${id}`)}
            className="ml-auto rounded-md border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
          >
            Status
          </button>
        )}
      </div>
    </div>
  );
};

const CommentList = ({ comments }: { comments: TaskComment[] }) => (
  <div className="space-y-2">
    {comments.map((comment, index) => {
      const text = comment.text || comment.message || comment.content || '';
      if (!text) return null;
      return (
        <div key={index} className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{text}</p>
          {(comment.author || comment.created_at) && (
            <p className="mt-1 text-[10px] text-slate-600">
              {[comment.author, formatDate(comment.created_at)].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      );
    })}
  </div>
);

export default function TaskCommandView({ command, fallbackText, onPrefillMessage }: TaskCommandViewProps) {
  const cmd = (command.command || '').toLowerCase();

  if ((cmd === 'taskinfo' || cmd === 'tasks') && command.tasks?.length) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-amber-100">Sizin ticketlər</h4>
          <span className="text-xs text-slate-500">{command.tasks.length} ədəd</span>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {command.tasks.map((ticket) => (
            <TicketCard
              key={getTicketId(ticket) || JSON.stringify(ticket)}
              ticket={ticket}
              onPrefillMessage={onPrefillMessage}
            />
          ))}
        </div>
      </div>
    );
  }

  if (cmd === 'newtask' && command.task) {
    const id = getTicketId(command.task);
    return (
      <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-4">
        <p className="text-sm font-semibold text-emerald-300">Ticket yaradıldı</p>
        {id && (
          <p className="mt-2 font-mono text-xs text-emerald-200/90 break-all">{id}</p>
        )}
        <TicketCard ticket={command.task} detailed />
      </div>
    );
  }

  if (cmd === 'taskstatus' && command.task) {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-amber-100">Ticket statusu</h4>
        <TicketCard ticket={command.task} onPrefillMessage={onPrefillMessage} detailed />
        {command.comments && command.comments.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Şərhlər</p>
            <CommentList comments={command.comments} />
          </div>
        )}
      </div>
    );
  }

  if (cmd === 'categories' && command.categories?.length) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-amber-100">Kateqoriyalar</h4>
        <div className="flex flex-wrap gap-2">
          {command.categories.map((cat, index) => {
            const id = typeof cat === 'string' ? cat : cat.id || cat.label || cat.name || '';
            if (!id) return null;
            return (
              <button
                key={`${id}-${index}`}
                type="button"
                onClick={() => onPrefillMessage?.(`/newtask ${id} `)}
                className="rounded-lg border border-slate-600 bg-slate-900/60 px-2.5 py-1 text-xs text-slate-200 hover:bg-slate-800"
              >
                {id}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (cmd === 'taskcomment') {
    return (
      <div className="rounded-xl border border-indigo-800/40 bg-indigo-950/20 p-3">
        <p className="text-sm font-medium text-indigo-200">Şərh əlavə edildi</p>
        {command.task && <div className="mt-2"><TicketCard ticket={command.task} /></div>}
        {fallbackText && <p className="mt-2 text-sm text-slate-400">{fallbackText}</p>}
      </div>
    );
  }

  if (fallbackText?.trim()) {
    return <p className="text-sm text-slate-300 whitespace-pre-wrap">{fallbackText}</p>;
  }

  return null;
}
