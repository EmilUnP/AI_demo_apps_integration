export type AssistantMode = 'chat' | 'task';

export const ASSISTANT_MODE_KEY = 'assistants_mode';

export type TaskQuickAction = {
  label: string;
  message: string;
  hint: string;
  /** Prefill input instead of sending (commands that need an id or text). */
  fillInput?: boolean;
};

export const TASK_QUICK_COMMANDS: TaskQuickAction[] = [
  { label: '/help', message: '/help', hint: 'List all slash commands' },
  { label: '/tasks', message: '/taskinfo', hint: 'All your tickets (newest first)' },
  { label: '/categories', message: '/categories', hint: 'Valid category ids for /newtask' },
  {
    label: '/taskstatus',
    message: '/taskstatus ',
    hint: 'Status — /taskstatus #1042 or UUID',
    fillInput: true,
  },
  {
    label: '/newtask',
    message: '/newtask ',
    hint: 'Create — /newtask <category> <description>',
    fillInput: true,
  },
  {
    label: '/taskcomment',
    message: '/taskcomment ',
    hint: 'Comment — /taskcomment #1042 <text>',
    fillInput: true,
  },
];

export const loadAssistantMode = (): AssistantMode => {
  if (typeof window === 'undefined') return 'chat';
  const saved = sessionStorage.getItem(ASSISTANT_MODE_KEY);
  return saved === 'task' ? 'task' : 'chat';
};

export const saveAssistantMode = (mode: AssistantMode): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(ASSISTANT_MODE_KEY, mode);
};
