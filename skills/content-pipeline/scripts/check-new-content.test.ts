import { describe, expect, it, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { extractText, readNewContent, isRelevant } from "./check-new-content";
import { loadConfig } from "./lib/config-schema";

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "check-new-content-test-"));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tmpDirs.length) {
    const dir = tmpDirs.pop()!;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("loadConfig (as consumed by check-new-content)", () => {
  it("merges a config file's sourceMaterial with schema defaults", () => {
    const dir = makeTmpDir();
    fs.writeFileSync(
      path.join(dir, "content-pipeline.config.json"),
      JSON.stringify({ sourceMaterial: { chatsDir: "/tmp/chats", relevancePatterns: ["my-project"] } }),
    );
    const { config } = loadConfig(dir);
    expect(config.sourceMaterial.chatsDir).toBe("/tmp/chats");
    expect(config.sourceMaterial.relevancePatterns).toEqual(["my-project"]);
    expect(config.sourceMaterial.claudeProjectsDir).toBe("");
    expect(config.docsRoot).toBe("docs");
  });

  it("throws a validation error when sourceMaterial has the wrong shape", () => {
    const dir = makeTmpDir();
    fs.writeFileSync(
      path.join(dir, "content-pipeline.config.json"),
      JSON.stringify({ sourceMaterial: { relevancePatterns: "not-an-array" } }),
    );
    expect(() => loadConfig(dir)).toThrow(/sourceMaterial.relevancePatterns/);
  });
});

describe("extractText", () => {
  it("returns a plain string unchanged", () => {
    expect(extractText("hello there")).toBe("hello there");
  });

  it("joins text blocks from a content-block array, skipping non-text blocks", () => {
    const blocks = [
      { type: "text", text: "first" },
      { type: "tool_use", name: "SomeTool" },
      { type: "text", text: "second" },
    ];
    expect(extractText(blocks)).toBe("first\nsecond");
  });

  it("returns an empty string for an empty array", () => {
    expect(extractText([])).toBe("");
  });
});

describe("readNewContent", () => {
  function writeSession(dir: string, filename: string, lines: object[]): string {
    const filepath = path.join(dir, filename);
    fs.writeFileSync(filepath, lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
    return filepath;
  }

  it("reads only the delta past a byte offset (resume behavior)", () => {
    const dir = makeTmpDir();
    writeSession(dir, "session.jsonl", [
      { type: "user", message: { content: "first message" } },
      { type: "assistant", message: { content: "first reply" } },
    ]);
    const fullSize = fs.statSync(path.join(dir, "session.jsonl")).size;

    fs.appendFileSync(
      path.join(dir, "session.jsonl"),
      JSON.stringify({ type: "user", message: { content: "second message" } }) + "\n",
    );

    const fromStart = readNewContent(dir, "session.jsonl", 0);
    expect(fromStart.userCount).toBe(2);
    expect(fromStart.assistantCount).toBe(1);

    const fromOffset = readNewContent(dir, "session.jsonl", fullSize);
    expect(fromOffset.userCount).toBe(1);
    expect(fromOffset.assistantCount).toBe(0);
    expect(fromOffset.messages).toEqual([{ role: "user", text: "second message" }]);
  });

  it("returns an empty result when the offset is at or past the file size", () => {
    const dir = makeTmpDir();
    const filepath = writeSession(dir, "session.jsonl", [
      { type: "user", message: { content: "only message" } },
    ]);
    const size = fs.statSync(filepath).size;
    const result = readNewContent(dir, "session.jsonl", size);
    expect(result).toEqual({ messages: [], userCount: 0, assistantCount: 0, newBytes: 0 });
  });

  it("pairs an AskUserQuestion tool_use with its later tool_result into one qa message", () => {
    const dir = makeTmpDir();
    writeSession(dir, "session.jsonl", [
      {
        type: "assistant",
        message: {
          content: [
            {
              type: "tool_use",
              id: "tool-1",
              name: "AskUserQuestion",
              input: { questions: [{ question: "Pick one", options: [{ label: "A" }, { label: "B" }] }] },
            },
          ],
        },
      },
      {
        type: "user",
        message: {
          content: [{ type: "tool_result", tool_use_id: "tool-1", content: "A" }],
        },
      },
    ]);
    const result = readNewContent(dir, "session.jsonl", 0);
    expect(result.messages).toEqual([{ role: "qa", text: "Q: Pick one [A | B]\n  → A" }]);
  });

  it("skips unparseable lines instead of throwing", () => {
    const dir = makeTmpDir();
    fs.writeFileSync(
      path.join(dir, "session.jsonl"),
      `not json\n${JSON.stringify({ type: "user", message: { content: "valid line" } })}\n`,
    );
    const result = readNewContent(dir, "session.jsonl", 0);
    expect(result.userCount).toBe(1);
    expect(result.messages).toEqual([{ role: "user", text: "valid line" }]);
  });
});

describe("isRelevant", () => {
  it("returns false when the pattern list is empty", () => {
    expect(isRelevant("anything at all", [])).toBe(false);
  });

  it("returns true when the text contains a configured pattern", () => {
    expect(isRelevant("working on my-project today", ["my-project"])).toBe(true);
  });

  it("returns false when none of the configured patterns match", () => {
    expect(isRelevant("unrelated text", ["my-project", "other-project"])).toBe(false);
  });
});
