'use client';

import {
  formatTicketRef,
  getTaskComments,
  getTicketRef,
  normalizeCommandName,
  statusLabel,
  statusTone,
  TaskCommandCatalogEntry,
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
  red: 'bg-red-950/50 text-red-300 border-red-800/50',
} as const;

const StatusBadge = ({ status }: { status?: string }) => {
  const tone = statusTone(status);
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${toneClasses[tone]}`}
    >
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

const ErrorBanner = ({ code, message }: { code?: string; message?: string }) => (
  <div className={`rounded-xl border p-3 ${toneClasses.red}`}>
    <p className="text-sm font-medium">Əmr uğursuz oldu</p>
    <p className="mt-1 text-sm opacity-90">{message || 'Naməlum xəta'}</p>
    {code && <p className="mt-1 font-mono text-[10px] opacity-70">{code}</p>}
  </div>
);

const UsageHint = ({ syntax, example }: { syntax?: string; example?: string }) => {
  if (!syntax && !example) return null;
  return (
    <div className="rounded-lg border border-slate-700/80 bg-slate-900/50 px-3 py-2 text-xs text-slate-400">
      {syntax && (
        <p>
          <span className="text-slate-500">Sintaksis:</span>{' '}
          <code className="text-amber-200/90">{syntax}</code>
        </p>
      )}
      {example && (
        <p className="mt-1">
          <span className="text-slate-500">Nümunə:</span>{' '}
          <code className="text-amber-200/90">{example}</code>
        </p>
      )}
    </div>
  );
};

const CommandCatalog = ({
  commands,
  onPrefillMessage,
}: {
  commands: TaskCommandCatalogEntry[];
  onPrefillMessage?: (message: string) => void;
}) => (
  <div className="space-y-2">
    <h4 className="text-sm font-semibold text-amber-100">Slash əmrləri</h4>
    <div className="divide-y divide-slate-800 rounded-xl border border-slate-700/80 overflow-hidden">
      {commands.map((entry, index) => {
        const name = entry.name || '';
        const label = name.startsWith('/') ? name : `/${name}`;
        const aliases = entry.aliases?.filter((a) => a && a !== name).join(', ');
        return (
          <div
            key={`${label}-${index}`}
            className="flex flex-wrap items-start justify-between gap-2 bg-slate-950/40 px-3 py-2.5"
          >
            <div className="min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onPrefillMessage?.(label)}
                className="font-mono text-sm text-amber-200 hover:text-amber-100"
              >
                {label}
                {entry.args ? ` ${entry.args}` : ''}
              </button>
              {aliases && <p className="mt-0.5 text-[10px] text-slate-600">Aliases: {aliases}</p>}
              {entry.description && (
                <p className="mt-1 text-xs text-slate-400">{entry.description}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const TicketCard = ({
  ticket,
  onPrefillMessage,
  detailed = false,
}: {
  ticket: TaskTicket;
  onPrefillMessage?: (message: string) => void;
  detailed?: boolean;
}) => {
  const ref = getTicketRef(ticket);
  const displayRef = formatTicketRef(ticket);
  const description = ticket.description || ticket.title || '';
  const updated = formatDate(ticket.updated_at || ticket.created_at);

  return (
    <div className="rounded-xl border border-slate-700/80 bg-slate-950/50 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-amber-200">{displayRef}</span>
            {ticket.priority && ticket.priority !== 'normal' && (
              <span className="text-[10px] uppercase text-slate-500">{ticket.priority}</span>
            )}
          </div>
          {description && (
            <p className={`mt-1 text-sm text-slate-100 ${detailed ? '' : 'line-clamp-2'}`}>
              {description}
            </p>
          )}
          {ticket.category && (
            <p className="mt-1 text-xs text-slate-500">
              Kateqoriya: <span className="text-amber-200/90">{ticket.category}</span>
            </p>
          )}
          {(ticket.external_user_name || ticket.external_user_email) && detailed && (
            <p className="mt-1 text-xs text-slate-500">
              {[ticket.external_user_name, ticket.external_user_email].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <StatusBadge status={ticket.status} />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {updated && <span className="text-[10px] text-slate-600">{updated}</span>}
        {ref && onPrefillMessage && (
          <>
            <button
              type="button"
              onClick={() => onPrefillMessage(`/taskstatus ${ref}`)}
              className="rounded-md border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
            >
              Status
            </button>
            <button
              type="button"
              onClick={() => onPrefillMessage(`/taskcomment ${ref} `)}
              className="rounded-md border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
            >
              Şərh
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const CommentList = ({ comments }: { comments: TaskComment[] }) => (
  <div className="space-y-2">
    {comments.map((comment, index) => {
      const text = comment.text || comment.message || comment.content || comment.body || '';
      if (!text) return null;
      return (
        <div key={index} className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{text}</p>
          {(comment.author || comment.created_at) && (
            <p className="mt-1 text-[10px] text-slate-600">
              {[comment.author || comment.role, formatDate(comment.created_at)]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
        </div>
      );
    })}
  </div>
);

export default function TaskCommandView({
  command,
  fallbackText,
  onPrefillMessage,
}: TaskCommandViewProps) {
  const cmd = normalizeCommandName(command.command);
  const comments = getTaskComments(command);

  if (command.ok === false && command.error) {
    return (
      <div className="space-y-3">
        <ErrorBanner code={command.error.code} message={command.error.message} />
        {command.usage && (
          <UsageHint syntax={command.usage.syntax} example={command.usage.example} />
        )}
        {fallbackText?.trim() && (
          <p className="text-sm text-slate-400 whitespace-pre-wrap">{fallbackText}</p>
        )}
      </div>
    );
  }

  if (cmd === 'help' && command.commands?.length) {
    return (
      <div className="space-y-3">
        <CommandCatalog commands={command.commands} onPrefillMessage={onPrefillMessage} />
        {command.categories && command.categories.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Kateqoriyalar
            </p>
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
        )}
      </div>
    );
  }

  if ((cmd === 'taskinfo' || cmd === 'tasks') && command.tasks?.length) {
    const total = command.total ?? command.tasks.length;
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-amber-100">Sizin ticketlər</h4>
          <span className="text-xs text-slate-500">{total} ədəd</span>
        </div>
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {command.tasks.map((ticket) => (
            <TicketCard
              key={getTicketRef(ticket) || JSON.stringify(ticket)}
              ticket={ticket}
              onPrefillMessage={onPrefillMessage}
            />
          ))}
        </div>
      </div>
    );
  }

  if (cmd === 'newtask' && command.task) {
    const ref = formatTicketRef(command.task);
    return (
      <div className="rounded-xl border border-emerald-800/40 bg-emerald-950/20 p-4 space-y-3">
        <div>
          <p className="text-sm font-semibold text-emerald-300">Ticket yaradıldı</p>
          <p className="mt-1 font-mono text-lg text-emerald-200">{ref}</p>
        </div>
        <TicketCard ticket={command.task} detailed />
      </div>
    );
  }

  if (cmd === 'taskstatus' && command.task) {
    return (
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-amber-100">Ticket statusu</h4>
        <TicketCard ticket={command.task} onPrefillMessage={onPrefillMessage} detailed />
        {comments.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              Şərhlər
            </p>
            <CommentList comments={comments} />
          </div>
        )}
      </div>
    );
  }

  if (cmd === 'categories' && command.categories?.length) {
    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-amber-100">Kateqoriyalar</h4>
        <p className="text-xs text-slate-500">/newtask üçün etibarlı id-lər</p>
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
    const ref = command.comment?.ticket_ref || formatTicketRef(command.task || {});
    return (
      <div className="rounded-xl border border-indigo-800/40 bg-indigo-950/20 p-3 space-y-2">
        <p className="text-sm font-medium text-indigo-200">Şərh əlavə edildi</p>
        {ref && ref !== '—' && (
          <p className="font-mono text-sm text-indigo-300/90">{ref}</p>
        )}
        {command.comment?.status && (
          <StatusBadge status={command.comment.status} />
        )}
        {command.task && (
          <div className="mt-2">
            <TicketCard ticket={command.task} />
          </div>
        )}
      </div>
    );
  }

  if (command.usage && (command.usage.syntax || command.usage.example)) {
    return (
      <div className="space-y-2">
        <UsageHint syntax={command.usage.syntax} example={command.usage.example} />
        {fallbackText?.trim() && (
          <p className="text-sm text-slate-400 whitespace-pre-wrap">{fallbackText}</p>
        )}
      </div>
    );
  }

  if (fallbackText?.trim()) {
    return <p className="text-sm text-slate-300 whitespace-pre-wrap">{fallbackText}</p>;
  }

  return null;
}
