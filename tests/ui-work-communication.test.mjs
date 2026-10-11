import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Work Hub keeps its storage boundary visible and uses shared controls and surfaces", async () => {
  const workHub = await readSource("../src/modules/WorkHubModule.tsx");
  assert.match(workHub, /storageNoticeKey/);
  assert.match(workHub, /inlineFormControlClassName/);
  assert.match(workHub, /className=\{formControlClassName\}/);
  assert.match(workHub, /className=\{`\$\{surfaceClassName\} space-y-3 p-4/);
  assert.match(workHub, /onContextMenu=\{openContextMenu\}/);
  assert.match(workHub, /<ContextMenu/);
  assert.match(workHub, /helper=\{activeTab === "tasks"/);
  assert.doesNotMatch(workHub, /FilterDrawerEdgeTrigger/);
});

test("Workspace and chat label locally stored data and visual-only calls", async () => {
  const [workspace, chat, callRoom] = await Promise.all([
    readSource("../src/modules/WorkspaceModule.tsx"),
    readSource("../src/modules/ChatModule.tsx"),
    readSource("../src/modules/CallRoomModal.tsx")
  ]);
  assert.match(workspace, /<PrototypeNotice label=\{t\(\"collab\.badge\.local_demo\"\)\}>\{t\(\"collab\.workspace\.modal_demo_hint\"\)\}<\/PrototypeNotice>/);
  assert.match(workspace, /className=\{`\$\{formControlClassName\} h-11`\}/);
  assert.match(chat, /<PrototypeNotice label=\{t\(\"collab\.badge\.local_demo\"\)\}>\{t\(\"collab\.chat\.demo_notice\"\)\}<\/PrototypeNotice>/);
  assert.match(callRoom, /role=\"note\" className=\"rounded-lg border border-warning/);
  assert.match(callRoom, /className=\{dangerButtonClass\}/);
});

test("mail keeps local-demo notices and existing compose boundaries", async () => {
  const mail = await readSource("../src/modules/MailModule.tsx");
  assert.match(mail, /role=\"note\" className=\"flex items-start[^\"]*border-warning/);
  assert.match(mail, /mail\.compose\.demo_notice/);
  assert.match(mail, /mail\.button\.send_demo/);
});
