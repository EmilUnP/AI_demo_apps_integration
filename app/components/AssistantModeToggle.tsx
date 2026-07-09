'use client';

import { AssistantMode } from '@/lib/assistantMode';

interface AssistantModeToggleProps {
  mode: AssistantMode;
  onChange: (mode: AssistantMode) => void;
  taskAvailable: boolean;
}

export default function AssistantModeToggle({ mode, onChange, taskAvailable }: AssistantModeToggleProps) {
  if (!taskAvailable) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 p-1">
      <button
        type="button"
        onClick={() => onChange('chat')}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
          mode === 'chat'
            ? 'bg-indigo-600 text-white shadow'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        Chat
      </button>
      <button
        type="button"
        onClick={() => onChange('task')}
        className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
          mode === 'task'
            ? 'bg-amber-600 text-white shadow'
            : 'text-slate-400 hover:text-slate-200'
        }`}
      >
        Task
      </button>
    </div>
  );
}
