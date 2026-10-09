import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Chat contact list uses a compact responsive pane and border-light rows", async () => {
  const chat = await readSource("../src/modules/ChatModule.tsx");
  assert.match(chat, /md:grid-cols-\[minmax\(15rem,18rem\)_minmax\(0,1fr\)\] lg:grid-cols-\[minmax\(17rem,20rem\)_minmax\(0,1fr\)\]/);
  assert.match(chat, /aria-label=\{t\(\"collab\.chat\.inbox\"\)\} className=\{`\$\{mobileChatOpen \? \"hidden\" : \"flex\"\}/);
  assert.match(chat, /min-h-0 flex-1 space-y-1 overflow-y-auto px-2 py-2/);
  assert.match(chat, /rounded-lg border-s-2 px-2 py-2\.5 text-start transition-colors/);
  assert.doesNotMatch(chat, /border-b border-theme px-3 py-3\.5/);
  assert.match(chat, /flex flex-wrap gap-1[^\n]*role=\"group\" aria-label=\{t\(\"collab\.chat\.filters\"\)\}/);
});

test("Contact presence indicators reflect direct-member status instead of always appearing online", async () => {
  const chat = await readSource("../src/modules/ChatModule.tsx");
  assert.match(chat, /conversation\.kind === \"DIRECT\"[\s\S]*?members\.find\(\(member\) => member\.id !== currentMemberId/);
  assert.match(chat, /directContact\?\.presence === \"ONLINE\"[\s\S]*?directContact\?\.presence === \"AWAY\"[\s\S]*?bg-muted/);
  assert.match(chat, /directContact && <span aria-hidden=\"true\"/);
  assert.match(chat, /w-full rounded-lg bg-surface p-2\.5 text-start transition-colors hover:bg-surface-muted/);
});
