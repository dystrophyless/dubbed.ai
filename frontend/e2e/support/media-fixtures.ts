import { readFileSync } from "node:fs";
import path from "node:path";

/* Container-level variants of the bundled real H.264/AAC clip. No fake filename/buffer or product demo state. */
type Atom = { start: number; size: number; type: string; children: Atom[] };
function atoms(buffer: Buffer, start = 0, end = buffer.length): Atom[] {
  const result: Atom[] = [];
  for (let at = start; at + 8 <= end;) {
    const size = buffer.readUInt32BE(at) || end - at;
    if (size < 8 || at + size > end) throw new Error("Invalid MP4 fixture atom");
    const type = buffer.toString("ascii", at + 4, at + 8);
    result.push({ start: at, size, type, children: ["moov", "trak", "mdia"].includes(type) ? atoms(buffer, at + 8, at + size) : [] });
    at += size;
  }
  return result;
}
const descendants = (list: Atom[]): Atom[] => list.flatMap((a) => [a, ...descendants(a.children)]);

export function sceneVariant(kind: "silent" | "long" | "portrait") {
  const buffer = readFileSync(path.join(process.cwd(), "public/media/scene.mp4"));
  const all = descendants(atoms(buffer));
  const tracks = all.filter((a) => a.type === "trak");
  const handler = (a: Atom) => descendants(a.children).find((c) => c.type === "hdlr");
  const track = (type: string) => tracks.find((a) => { const h = handler(a); return h && buffer.toString("ascii", h.start + 16, h.start + 20) === type; });
  if (kind === "silent") {
    const audio = track("soun");
    if (!audio) throw new Error("Fixture has no audio track to remove");
    buffer.write("free", audio.start + 4, "ascii"); // same-sized ignored box; all video sample offsets stay valid
  } else if (kind === "long") {
    // Scale the movie and track timebases by ten. Sample counts/offsets and edit-list ticks remain valid.
    for (const a of all.filter((a) => a.type === "mvhd" || a.type === "mdhd")) {
      if (buffer[a.start + 8] !== 0) throw new Error("Expected version-zero MP4 time header");
      const offset = a.start + 20;
      buffer.writeUInt32BE(Math.round(buffer.readUInt32BE(offset) / 10), offset);
    }
  } else {
    const video = track("vide");
    const tkhd = video && descendants(video.children).find((a) => a.type === "tkhd");
    if (!tkhd || buffer[tkhd.start + 8] !== 0) throw new Error("Expected video track header");
    // Standard MP4 display matrix: a quarter-turn, yielding a portrait intrinsic display size.
    const height = buffer.readUInt32BE(tkhd.start + tkhd.size - 4);
    [0, 65536, 0, -65536, 0, 0, height, 0, 1073741824].forEach((value, i) => buffer.writeInt32BE(value, tkhd.start + 48 + i * 4));
  }
  return { name: `${kind}-scene.mp4`, mimeType: "video/mp4", buffer };
}
