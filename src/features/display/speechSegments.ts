const MIN_FIRST_CLAUSE_WORDS = 4;

export function firstClauseEnd(text: string): number | null {
  const sentenceEnd = text.search(/[.!?]+\s/);
  for (const clause of text.matchAll(/[,;:—–]\s+/g)) {
    if (sentenceEnd !== -1 && clause.index > sentenceEnd) return null;
    const words = text.slice(0, clause.index).trim().split(/\s+/).length;
    if (words >= MIN_FIRST_CLAUSE_WORDS) return clause.index + clause[0].length;
  }
  return null;
}

export function splitSpeech(
  buffer: string,
  { isFinal, cutFirstClause }: { isFinal: boolean; cutFirstClause: boolean }
): { segments: string[]; rest: string } {
  const segments: string[] = [];
  let last = 0;

  const cut = cutFirstClause ? firstClauseEnd(buffer) : null;
  if (cut !== null) {
    segments.push(buffer.slice(0, cut).trim());
    last = cut;
  }

  const sentenceEnd = /[.!?]+\s+/g;
  sentenceEnd.lastIndex = last;
  let match: RegExpExecArray | null;
  while ((match = sentenceEnd.exec(buffer)) !== null) {
    const end = match.index + match[0].length;
    const sentence = buffer.slice(last, end).trim();
    if (sentence) segments.push(sentence);
    last = end;
  }

  if (!isFinal) return { segments, rest: buffer.slice(last) };
  const tail = buffer.slice(last).trim();
  if (tail) segments.push(tail);
  return { segments, rest: "" };
}
