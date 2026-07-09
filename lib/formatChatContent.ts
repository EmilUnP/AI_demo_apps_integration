/** Turn dense plain-text API replies (e.g. Task /help) into readable markdown. */
export const formatAssistantContent = (content: string): string => {
  const trimmed = content.trim();
  if (!trimmed) return trimmed;

  const nonEmptyLines = trimmed.split('\n').filter((line) => line.trim());
  if (nonEmptyLines.length >= 4) return trimmed;

  if (isDenseTaskHelp(trimmed)) {
    return formatDenseTaskHelp(trimmed);
  }

  if (isDenseCommandList(trimmed)) {
    return formatCommandListText(trimmed);
  }

  return trimmed;
};

const isDenseTaskHelp = (text: string): boolean =>
  /Available commands/i.test(text) ||
  (text.includes('/help') && (text.includes('/newtask') || text.includes('/taskinfo')));

const isDenseCommandList = (text: string): boolean =>
  /(?:^|\s)\/[a-z][\w]*\s*[—–-]/i.test(text) && text.split('\n').length < 3;

const splitCommandDescriptions = (block: string): string[] => {
  const parts = block.split(/\s+(?=\/[a-z])/i).filter(Boolean);
  return parts.map((part) => {
    const match = part.match(
      /^(\/[a-z0-9_<>][^—–-]*(?:\s+or\s+\/[a-z0-9_]+)?)\s*[—–-]\s*(.+)$/i
    );
    if (match) {
      return `\`${match[1].trim()}\` — ${match[2].trim()}`;
    }
    return part.trim();
  });
};

const takeSection = (
  text: string,
  label: RegExp
): { value: string; rest: string } => {
  const match = text.match(label);
  if (!match || match.index == null) return { value: '', rest: text };
  return {
    value: match[1]?.trim() ?? '',
    rest: text.slice(match.index + match[0].length).trim(),
  };
};

const formatDenseTaskHelp = (text: string): string => {
  let remaining = text.trim();
  const lines: string[] = [];

  remaining = remaining.replace(/^Available commands\s*\([^)]+\)\s*:?\s*/i, '');
  lines.push('### Available commands');
  lines.push('*Instant replies — no LLM cost*');
  lines.push('');

  const commandsStop = remaining.search(
    /\s+(Examples:|Available categories:|You can also|Tickets are tied)/i
  );
  const commandsBlock =
    commandsStop >= 0 ? remaining.slice(0, commandsStop).trim() : remaining;
  remaining = commandsStop >= 0 ? remaining.slice(commandsStop).trim() : '';

  for (const item of splitCommandDescriptions(commandsBlock)) {
    lines.push(`- ${item}`);
  }

  const { value: examples, rest: afterExamples } = takeSection(
    remaining,
    /^Examples:\s*(.+?)(?=\s+Available categories:|\s+You can also|\s+Tickets are tied|$)/is
  );
  if (examples) {
    lines.push('');
    lines.push('**Examples**');
    for (const example of examples.split(/\s+(?=\/)/).filter(Boolean)) {
      lines.push(`- \`${example.trim()}\``);
    }
  }
  remaining = afterExamples;

  const { value: categories, rest: afterCategories } = takeSection(
    remaining,
    /^Available categories:\s*(.+?)(?=\s+You can also|\s+Tickets are tied|$)/is
  );
  if (categories) {
    lines.push('');
    lines.push('**Available categories**');
    lines.push(
      categories
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => `\`${c}\``)
        .join(' · ')
    );
  }
  remaining = afterCategories;

  for (const pattern of [/^You can also.+$/im, /^Tickets are tied.+$/im]) {
    const note = remaining.match(pattern);
    if (note) {
      lines.push('');
      lines.push(`*${note[0].trim()}*`);
    }
  }

  return lines.join('\n').trim();
};

const formatCommandListText = (text: string): string => {
  const headerMatch = text.match(/^(.+?:)\s*/);
  const lines: string[] = [];
  let body = text;

  if (headerMatch) {
    lines.push(`**${headerMatch[1].replace(/:$/, '')}**`);
    lines.push('');
    body = text.slice(headerMatch[0].length);
  }

  for (const item of splitCommandDescriptions(body)) {
    lines.push(`- ${item}`);
  }

  return lines.join('\n');
};
