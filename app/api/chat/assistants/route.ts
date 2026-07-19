import { NextResponse } from 'next/server';
import { listConfiguredAssistants } from '@/lib/chatApiServer';
import { PUBLIC_ASSISTANTS } from '@/lib/assistantsConfig';

/** Public assistant catalog — no secrets. */
export async function GET() {
  const configured = listConfiguredAssistants();
  const byId = Object.fromEntries(configured.map((row) => [row.id, row]));

  const data = PUBLIC_ASSISTANTS.map((assistant) => ({
    id: assistant.id,
    name: assistant.name,
    description: assistant.description,
    image: assistant.image,
    chatConfigured: !!byId[assistant.id]?.chatConfigured,
    taskConfigured: !!byId[assistant.id]?.taskConfigured,
    supportsTaskMode: assistant.supportsTaskMode && !!byId[assistant.id]?.taskConfigured,
  }));

  return NextResponse.json({ success: true, data });
}
