export interface Annotation {
  time: number;
  label: string;
}

const TIME = String.raw`\d+(?::\d{1,2}){0,2}(?:[.,]\d+)?`;

export function parseTime(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!new RegExp(`^${TIME}$`).test(normalized)) return null;
  return normalized.split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
}

const unquote = (label: string) =>
  label.startsWith('"') && label.endsWith('"') ? label.slice(1, -1).replaceAll('""', '"') : label;

interface Format {
  detect: (text: string) => boolean;
  parse: (text: string) => Annotation[];
}

/** Tried in order; the first format whose signature matches parses the text. */
const FORMATS: Format[] = [
  {
    // LiveSplit splits file: cumulative personal-best time per segment.
    detect: (text) => /<Segment>/.test(text),
    parse: (text) =>
      [...text.matchAll(/<Segment>([\s\S]*?)<\/Segment>/g)].flatMap(([, body = ""]) => {
        const name = /<Name>([\s\S]*?)<\/Name>/.exec(body)?.[1]?.trim() ?? "";
        const pb = /<SplitTime name="Personal Best">\s*<RealTime>([^<]+)<\/RealTime>/.exec(
          body,
        )?.[1];
        const time = pb ? parseTime(pb.replace(/(\.\d{3})\d+$/, "$1")) : null;
        return time === null ? [] : [{ time, label: name }];
      }),
  },
  {
    // SRT / WebVTT cues.
    detect: (text) => text.includes("-->"),
    parse: (text) =>
      text.split(/\r?\n\s*\r?\n/).flatMap((block) => {
        const lines = block.split(/\r?\n/);
        const cueIndex = lines.findIndex((l) => l.includes("-->"));
        const time = cueIndex >= 0 ? parseTime(lines[cueIndex]?.split("-->")[0] ?? "") : null;
        if (time === null) return [];
        return [
          {
            time,
            label: lines
              .slice(cueIndex + 1)
              .join(" ")
              .replace(/<[^>]+>/g, "")
              .trim(),
          },
        ];
      }),
  },
  {
    // One annotation per line: chapter lists, CSV and TSV.
    detect: () => true,
    parse: (text) =>
      text.split(/\r?\n/).flatMap((line) => {
        const match = new RegExp(String.raw`^\s*\[?(${TIME})\]?\s*(?:[-–—,\t:]\s*)?(.*)$`).exec(
          line,
        );
        const time = match?.[1] ? parseTime(match[1]) : null;
        return time === null ? [] : [{ time, label: unquote((match?.[2] ?? "").trim()) }];
      }),
  },
];

export function parseAnnotations(text: string): Annotation[] {
  const format = FORMATS.find((f) => f.detect(text));
  return (format?.parse(text) ?? []).sort((a, b) => a.time - b.time);
}
