/** PersonaAI Task assistant — structured slash-command payloads (data.task_command). */

export type TaskCommandName =
  | 'help'
  | 'categories'
  | 'taskinfo'
  | 'tasks'
  | 'taskstatus'
  | 'newtask'
  | 'taskcomment'
  | 'unknown'
  | string;

export interface TaskTicket {
  id?: string;
  task_id?: string;
  ticket_number?: number;
  ticket_ref?: string;
  status?: string;
  category?: string;
  description?: string;
  title?: string;
  priority?: string;
  task_type?: string | null;
  external_user_name?: string;
  external_user_email?: string;
  created_at?: string;
  updated_at?: string;
  comments?: TaskComment[];
}

export interface TaskComment {
  text?: string;
  message?: string;
  content?: string;
  body?: string;
  created_at?: string;
  author?: string;
  role?: string;
}

export interface TaskCommentResult {
  ticket_ref?: string;
  task_id?: string;
  comment_id?: string;
  status?: string;
}

export interface TaskCommandCatalogEntry {
  name?: string;
  aliases?: string[];
  args?: string;
  description?: string;
}

export interface TaskCommandUsage {
  syntax?: string;
  example?: string;
}

export interface TaskCommandError {
  code?: string;
  message?: string;
}

export interface TaskCommandData {
  command?: TaskCommandName;
  ok?: boolean;
  language?: string;
  total?: number;
  tasks?: TaskTicket[];
  task?: TaskTicket;
  comment?: TaskCommentResult;
  categories?: Array<string | { id?: string; label?: string; name?: string }>;
  commands?: TaskCommandCatalogEntry[];
  usage?: TaskCommandUsage;
  error?: TaskCommandError;
  comments?: TaskComment[];
  [key: string]: unknown;
}

export const getTicketId = (ticket: TaskTicket): string =>
  (ticket.task_id || ticket.id || '').trim();

/** Short ref for /taskstatus and /taskcomment — prefer #1042 over UUID. */
export const getTicketRef = (ticket: TaskTicket): string => {
  if (ticket.ticket_ref?.trim()) return ticket.ticket_ref.replace(/^#/, '').trim();
  if (ticket.ticket_number != null) return String(ticket.ticket_number);
  return getTicketId(ticket);
};

export const formatTicketRef = (ticket: TaskTicket): string => {
  if (ticket.ticket_ref?.trim()) return ticket.ticket_ref.trim();
  if (ticket.ticket_number != null) return `#${ticket.ticket_number}`;
  const id = getTicketId(ticket);
  if (!id) return '—';
  return id.length > 16 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;
};

export const getTaskComments = (command: TaskCommandData): TaskComment[] =>
  command.task?.comments ?? command.comments ?? [];

export const parseTaskCommandFromResponse = (data: unknown): TaskCommandData | null => {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;
  const nested =
    root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : null;
  const cmd = (nested?.task_command ?? root.task_command) as TaskCommandData | undefined;
  if (!cmd || typeof cmd !== 'object') return null;
  if (
    cmd.command ||
    cmd.tasks?.length ||
    cmd.task ||
    cmd.categories?.length ||
    cmd.commands?.length ||
    cmd.comment ||
    cmd.error
  ) {
    return cmd;
  }
  return null;
};

export const normalizeCommandName = (command?: string): string =>
  (command || '').toLowerCase().replace(/^\//, '');

export const hasStructuredTaskUi = (cmd: TaskCommandData): boolean => {
  if (cmd.ok === false && cmd.error) return true;
  const name = normalizeCommandName(cmd.command);
  if ((name === 'taskinfo' || name === 'tasks') && cmd.tasks?.length) return true;
  if (name === 'newtask' && cmd.task) return true;
  if (name === 'taskstatus' && cmd.task) return true;
  if (name === 'categories' && cmd.categories?.length) return true;
  if (name === 'taskcomment' && (cmd.comment || cmd.task)) return true;
  if (name === 'help' && cmd.commands?.length) return true;
  return false;
};

export const resolveTaskDisplayContent = (
  responseText: string,
  taskCommand: TaskCommandData | null
): string => {
  if (!taskCommand) return responseText.trim();
  if (hasStructuredTaskUi(taskCommand)) return '';
  if (taskCommand.ok === false) return responseText.trim();
  return responseText.trim();
};

export const normalizeStatus = (status?: string): string => {
  if (!status) return 'unknown';
  return status.toLowerCase().replace(/\s+/g, '_');
};

export const statusLabel = (status?: string): string => {
  const s = normalizeStatus(status);
  if (s === 'open' || s === 'active' || s === 'in_progress') return 'Açıq';
  if (s === 'closed' || s === 'completed' || s === 'resolved') return 'Bağlı';
  if (s === 'pending') return 'Gözləyir';
  return status || '—';
};

export const statusTone = (
  status?: string
): 'emerald' | 'amber' | 'slate' | 'indigo' => {
  const s = normalizeStatus(status);
  if (s === 'open' || s === 'active' || s === 'in_progress') return 'emerald';
  if (s === 'pending') return 'amber';
  if (s === 'closed' || s === 'completed' || s === 'resolved') return 'slate';
  return 'indigo';
};
