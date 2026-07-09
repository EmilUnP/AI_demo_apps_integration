export interface TaskTicket {
  id?: string;
  task_id?: string;
  status?: string;
  category?: string;
  description?: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
  priority?: string;
}

export interface TaskComment {
  text?: string;
  message?: string;
  content?: string;
  created_at?: string;
  author?: string;
  role?: string;
}

export interface TaskCommandData {
  command?: string;
  tasks?: TaskTicket[];
  task?: TaskTicket;
  categories?: Array<string | { id?: string; label?: string; name?: string }>;
  comments?: TaskComment[];
  [key: string]: unknown;
}

export const getTicketId = (ticket: TaskTicket): string =>
  (ticket.id || ticket.task_id || '').trim();

export const parseTaskCommandFromResponse = (data: unknown): TaskCommandData | null => {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, unknown>;
  const nested = root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : null;
  const cmd = (nested?.task_command ?? root.task_command) as TaskCommandData | undefined;
  if (!cmd || typeof cmd !== 'object') return null;
  if (!cmd.command && !cmd.tasks?.length && !cmd.task && !cmd.categories?.length) return null;
  return cmd;
};

export const normalizeStatus = (status?: string): string => {
  if (!status) return 'unknown';
  return status.toLowerCase().replace(/\s+/g, '_');
};

export const statusLabel = (status?: string): string => {
  const s = normalizeStatus(status);
  if (s === 'open' || s === 'active' || s === 'in_progress') return 'Aktiv';
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
