import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { loadConfig } from "./lib/config-schema";

const DEFAULT_CLAUDE_PROJECTS_DIR = path.join(os.homedir(), ".claude", "projects");

interface ContentBlock {
  type: string;
  text?: string;
  name?: string;
  id?: string;
  tool_use_id?: string;
  input?: { questions?: AskQuestion[] };
  content?: string;
}

interface AskQuestion {
  question: string;
  options?: { label: string; description?: string }[];
}

interface Message {
  role: "user" | "assistant" | "qa";
  text: string;
}

interface ReadResult {
  messages: Message[];
  userCount: number;
  assistantCount: number;
  newBytes: number;
}

interface Cursor {
  lastByteOffset: number;
  lastChecked: string;
}

interface CursorsData {
  version: number;
  cursors: Record<string, Cursor>;
}

export function extractText(content: string | ContentBlock[]): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text!)
    .join("\n");
}

export function extractAskQuestions(
  content: ContentBlock[]
): { toolUseId: string; questions: AskQuestion[] }[] {
  const results: { toolUseId: string; questions: AskQuestion[] }[] = [];
  for (const block of content) {
    if (
      block.type === "tool_use" &&
      block.name === "AskUserQuestion" &&
      block.id &&
      block.input?.questions
    ) {
      results.push({ toolUseId: block.id, questions: block.input.questions });
    }
  }
  return results;
}

export function extractToolResults(content: ContentBlock[]): Map<string, string> {
  const results = new Map<string, string>();
  for (const block of content) {
    if (block.type === "tool_result" && block.tool_use_id) {
      const text = typeof block.content === "string" ? block.content : "";
      results.set(block.tool_use_id, text);
    }
  }
  return results;
}

/** Formats any pending AskUserQuestion blocks in `content` into pendingQuestions, keyed by tool_use_id. */
export function collectPendingQuestions(
  content: ContentBlock[],
  pendingQuestions: Map<string, string>
): void {
  for (const ask of extractAskQuestions(content)) {
    const formatted = ask.questions
      .map((q) => {
        const opts = q.options ? q.options.map((o) => o.label).join(" | ") : "";
        return opts ? `Q: ${q.question} [${opts}]` : `Q: ${q.question}`;
      })
      .join("; ");
    pendingQuestions.set(ask.toolUseId, formatted);
  }
}

/** Matches tool_result answers in `content` against pendingQuestions, returning formatted Q&A messages and consuming the matched entries. */
export function applyPendingAnswers(
  content: ContentBlock[],
  pendingQuestions: Map<string, string>
): Message[] {
  const messages: Message[] = [];
  for (const [toolUseId, answerText] of extractToolResults(content)) {
    const questionText = pendingQuestions.get(toolUseId);
    if (!questionText) continue;
    messages.push({ role: "qa", text: `${questionText}\n  → ${answerText}` });
    pendingQuestions.delete(toolUseId);
  }
  return messages;
}

function readUserLine(
  content: string | ContentBlock[],
  pendingQuestions: Map<string, string>
): { messages: Message[]; isUserMsg: boolean } {
  const messages: Message[] = [];
  if (Array.isArray(content)) {
    messages.push(...applyPendingAnswers(content, pendingQuestions));
  }
  const txt = extractText(content);
  const isUserMsg = !!txt && !txt.startsWith("[Request interrupted");
  if (isUserMsg) messages.push({ role: "user", text: txt });
  return { messages, isUserMsg };
}

function readAssistantLine(
  content: string | ContentBlock[],
  pendingQuestions: Map<string, string>
): { messages: Message[]; isAssistantMsg: boolean } {
  const messages: Message[] = [];
  if (Array.isArray(content)) {
    collectPendingQuestions(content, pendingQuestions);
  }
  const txt = extractText(content);
  const isAssistantMsg = !!txt;
  if (isAssistantMsg) messages.push({ role: "assistant", text: txt });
  return { messages, isAssistantMsg };
}

export function readNewContent(chatsDir: string, filename: string, fromOffset: number): ReadResult {
  const filepath = path.isAbsolute(filename) ? filename : path.join(chatsDir, filename);
  const realPath = fs.realpathSync(filepath);
  const fileSize = fs.statSync(realPath).size;

  if (fromOffset >= fileSize) {
    return { messages: [], userCount: 0, assistantCount: 0, newBytes: 0 };
  }

  const buffer = Buffer.alloc(fileSize - fromOffset);
  const fd = fs.openSync(realPath, "r");
  fs.readSync(fd, buffer, 0, buffer.length, fromOffset);
  fs.closeSync(fd);

  const lines = buffer.toString("utf-8").split("\n").filter((l) => l.trim());

  const messages: Message[] = [];
  let userCount = 0;
  let assistantCount = 0;
  const pendingQuestions = new Map<string, string>();

  for (const line of lines) {
    let obj: any;
    try {
      obj = JSON.parse(line);
    } catch {
      continue; // skip unparseable lines (partial reads, etc.)
    }

    if (obj.type === "user" && obj.message) {
      const { messages: msgs, isUserMsg } = readUserLine(obj.message.content, pendingQuestions);
      messages.push(...msgs);
      if (isUserMsg) userCount++;
    } else if (obj.type === "assistant" && obj.message) {
      const { messages: msgs, isAssistantMsg } = readAssistantLine(obj.message.content, pendingQuestions);
      messages.push(...msgs);
      if (isAssistantMsg) assistantCount++;
    }
  }

  return { messages, userCount, assistantCount, newBytes: fileSize - fromOffset };
}

export function isRelevant(textToCheck: string, patterns: string[]): boolean {
  return patterns.some((pattern) => textToCheck.includes(pattern));
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "...";
}

function getJsonlFiles(chatsDir: string): string[] {
  return fs
    .readdirSync(chatsDir)
    .filter((f) => f.endsWith(".jsonl"))
    .sort();
}

function resolveFileSize(chatsDir: string, filename: string): number {
  const filepath = path.join(chatsDir, filename);
  const realPath = fs.realpathSync(filepath);
  return fs.statSync(realPath).size;
}

function resolveCursorsFile(docsRoot: string): string {
  return path.join(process.cwd(), docsRoot, "content-pipeline", ".cursors.json");
}

function loadCursors(cursorsFile: string): CursorsData {
  if (fs.existsSync(cursorsFile)) {
    return JSON.parse(fs.readFileSync(cursorsFile, "utf-8"));
  }
  return { version: 1, cursors: {} };
}

function saveCursors(cursorsFile: string, data: CursorsData): void {
  fs.mkdirSync(path.dirname(cursorsFile), { recursive: true });
  fs.writeFileSync(cursorsFile, JSON.stringify(data, null, 2) + "\n");
}

// --- Modes ---

function scanMode(chatsDir: string, cursorsFile: string): void {
  const cursors = loadCursors(cursorsFile);
  const files = getJsonlFiles(chatsDir);

  let anyNew = false;

  for (const file of files) {
    const size = resolveFileSize(chatsDir, file);
    const cursor = cursors.cursors[file];
    const lastOffset = cursor?.lastByteOffset ?? 0;
    const delta = size - lastOffset;

    if (delta <= 0) continue;

    anyNew = true;
    const { messages, userCount, assistantCount } = readNewContent(chatsDir, file, lastOffset);

    console.log(`\n=== ${file} ===`);
    console.log(
      `  ${delta.toLocaleString()} new bytes (${lastOffset.toLocaleString()} -> ${size.toLocaleString()})`
    );
    console.log(`  ${userCount} user messages, ${assistantCount} assistant messages`);

    const userMessages = messages.filter((m) => m.role === "user");
    if (userMessages.length > 0) {
      console.log("  User message snippets:");
      for (const msg of userMessages.slice(0, 10)) {
        console.log(`    - ${truncate(msg.text.replace(/\n/g, " "), 200)}`);
      }
      if (userMessages.length > 10) {
        console.log(`    ... and ${userMessages.length - 10} more`);
      }
    }
  }

  if (!anyNew) {
    console.log("No new content since last cursor update.");
  }
}

function updateMode(chatsDir: string, cursorsFile: string): void {
  const cursors = loadCursors(cursorsFile);
  const files = getJsonlFiles(chatsDir);

  for (const file of files) {
    const size = resolveFileSize(chatsDir, file);
    cursors.cursors[file] = {
      lastByteOffset: size,
      lastChecked: new Date().toISOString(),
    };
  }

  // Remove cursors for files that no longer exist
  for (const key of Object.keys(cursors.cursors)) {
    if (!files.includes(key)) {
      delete cursors.cursors[key];
    }
  }

  saveCursors(cursorsFile, cursors);
  console.log(`Updated cursors for ${files.length} files.`);
}

function summaryMode(chatsDir: string, cursorsFile: string, targetFile: string): void {
  const cursors = loadCursors(cursorsFile);
  const cursor = cursors.cursors[targetFile];
  const lastOffset = cursor?.lastByteOffset ?? 0;

  const { messages, userCount, assistantCount } = readNewContent(chatsDir, targetFile, lastOffset);

  if (messages.length === 0) {
    console.log(`No new messages in ${targetFile}.`);
    return;
  }

  console.log(`\n=== Summary: ${targetFile} ===`);
  console.log(`${userCount} user + ${assistantCount} assistant messages:\n`);

  for (const msg of messages) {
    if (msg.role === "qa") {
      console.log(`[Q&A] ${truncate(msg.text.replace(/\n/g, " "), 500)}`);
    } else {
      const label = msg.role === "user" ? "[USER]" : "[ASSISTANT]";
      console.log(`${label} ${truncate(msg.text.replace(/\n/g, " "), 500)}`);
    }
  }
}

function parseDiscoveryLine(line: string): { cwd: string; userMsg: string } {
  try {
    const obj = JSON.parse(line);
    const cwd = typeof obj.cwd === "string" ? obj.cwd : "";
    let userMsg = "";
    if (obj.type === "user" && obj.message) {
      const txt = extractText(obj.message.content);
      if (txt && !txt.startsWith("[Request interrupted")) userMsg = txt;
    }
    return { cwd, userMsg };
  } catch {
    return { cwd: "", userMsg: "" };
  }
}

/** Reads the leading chunk of a session file to find its cwd + first user message, for --discover's relevance check. */
export function readCwdAndFirstMessage(fullPath: string): { cwd: string; firstUserMsg: string; chunk: string } {
  const fd = fs.openSync(fullPath, "r");
  const buf = Buffer.alloc(Math.min(fs.statSync(fullPath).size, 65536));
  fs.readSync(fd, buf, 0, buf.length, 0);
  fs.closeSync(fd);

  const chunk = buf.toString("utf-8");
  const lines = chunk.split("\n").filter((l) => l.trim());

  let cwd = "";
  let firstUserMsg = "";
  for (const line of lines) {
    const parsed = parseDiscoveryLine(line);
    if (parsed.cwd && !cwd) cwd = parsed.cwd;
    if (parsed.userMsg && !firstUserMsg) firstUserMsg = parsed.userMsg;
    if (cwd && firstUserMsg) break;
  }
  return { cwd, firstUserMsg, chunk };
}

function discoverMode(chatsDir: string, claudeProjectsDir: string, relevancePatterns: string[]): void {
  const linkedTargets = new Set<string>();
  for (const file of getJsonlFiles(chatsDir)) {
    linkedTargets.add(fs.realpathSync(path.join(chatsDir, file)));
  }

  let projectDirs: string[];
  try {
    projectDirs = fs
      .readdirSync(claudeProjectsDir)
      .map((d) => path.join(claudeProjectsDir, d))
      .filter((d) => fs.statSync(d).isDirectory());
  } catch {
    console.error(`Cannot read ${claudeProjectsDir}`);
    process.exit(1);
  }

  const found: { file: string; cwd: string; firstUserMsg: string }[] = [];

  for (const dir of projectDirs) {
    let files: string[];
    try {
      files = fs.readdirSync(dir).filter((f) => f.endsWith(".jsonl"));
    } catch {
      continue;
    }

    for (const file of files) {
      const fullPath = path.join(dir, file);
      if (linkedTargets.has(fullPath)) continue;

      const { cwd, firstUserMsg, chunk } = readCwdAndFirstMessage(fullPath);
      const relevant =
        isRelevant(cwd, relevancePatterns) ||
        isRelevant(dir, relevancePatterns) ||
        isRelevant(chunk, relevancePatterns);

      if (relevant) found.push({ file: fullPath, cwd, firstUserMsg });
    }
  }

  if (found.length === 0) {
    console.log("No new relevant sessions found.");
    return;
  }

  // Figure out next symlink number
  const existing = getJsonlFiles(chatsDir);
  let nextNum = 0;
  for (const f of existing) {
    const match = f.match(/^(\d+)/);
    if (match) nextNum = Math.max(nextNum, parseInt(match[1]) + 1);
  }

  console.log(`Found ${found.length} unlinked session(s):\n`);
  for (const entry of found) {
    const padded = String(nextNum).padStart(2, "0");
    console.log(`  ${entry.file}`);
    console.log(`  cwd: ${entry.cwd}`);
    console.log(`  first message: ${truncate(entry.firstUserMsg.replace(/\n/g, " "), 200)}`);
    console.log(
      `  suggested: ln -s "${entry.file}" "${path.join(chatsDir, `${padded}-DESCRIBE-ME.jsonl`)}"`
    );
    console.log();
    nextNum++;
  }
}

/**
 * Auto-detects chatsDir/claudeProjectsDir and writes them into the
 * sourceMaterial section of content-pipeline.config.json (merging with
 * whatever else is already there — SKILL.md Step 0 owns the rest of the
 * config's interview). There is no separate shadow config in this script.
 */
function setupMode(configPath: string | null): void {
  const targetPath = configPath ?? path.join(process.cwd(), "content-pipeline.config.json");
  const existing = fs.existsSync(targetPath)
    ? (JSON.parse(fs.readFileSync(targetPath, "utf-8")) as Record<string, unknown>)
    : {};
  const sourceMaterial = (existing.sourceMaterial as Record<string, unknown>) ?? {};

  let chatsDir = typeof sourceMaterial.chatsDir === "string" ? sourceMaterial.chatsDir : "";
  if (!chatsDir) {
    const candidate = path.join(path.dirname(targetPath), "..", "claude-chats");
    if (fs.existsSync(candidate)) chatsDir = candidate;
  }
  const claudeProjectsDir =
    typeof sourceMaterial.claudeProjectsDir === "string" && sourceMaterial.claudeProjectsDir
      ? sourceMaterial.claudeProjectsDir
      : DEFAULT_CLAUDE_PROJECTS_DIR;
  const relevancePatterns = Array.isArray(sourceMaterial.relevancePatterns)
    ? sourceMaterial.relevancePatterns
    : [];

  const updated = {
    ...existing,
    sourceMaterial: { chatsDir, claudeProjectsDir, relevancePatterns },
  };

  fs.writeFileSync(targetPath, JSON.stringify(updated, null, 2) + "\n");
  console.log("Config saved to:", targetPath);
  console.log(JSON.stringify(updated.sourceMaterial, null, 2));
  console.log(
    "\nEdit content-pipeline.config.json to add relevance patterns or change directories."
  );
}

// --- CLI ---

function main(): void {
  const { config, path: configPath } = loadConfig();
  const args = process.argv.slice(2);

  if (args.includes("--setup")) {
    setupMode(configPath);
    return;
  }

  const chatsDir = config.sourceMaterial.chatsDir;
  if (!chatsDir) {
    console.error(
      "No sourceMaterial.chatsDir configured in content-pipeline.config.json. Run --setup to auto-detect, or add it via the Step 0 config interview."
    );
    process.exit(1);
  }

  const claudeProjectsDir = config.sourceMaterial.claudeProjectsDir || DEFAULT_CLAUDE_PROJECTS_DIR;
  const relevancePatterns = config.sourceMaterial.relevancePatterns;
  const cursorsFile = resolveCursorsFile(config.docsRoot);

  if (args.includes("--update")) {
    updateMode(chatsDir, cursorsFile);
  } else if (args.includes("--summary")) {
    const idx = args.indexOf("--summary");
    const file = args[idx + 1];
    if (!file) {
      console.error("Usage: --summary <filename.jsonl>");
      process.exit(1);
    }
    summaryMode(chatsDir, cursorsFile, file);
  } else if (args.includes("--discover")) {
    discoverMode(chatsDir, claudeProjectsDir, relevancePatterns);
  } else {
    scanMode(chatsDir, cursorsFile);
  }
}

if (process.argv[1]?.endsWith("check-new-content.ts")) {
  main();
}
