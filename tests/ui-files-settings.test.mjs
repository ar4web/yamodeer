import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readSource = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Files follows a document workspace layout while preserving the local vault boundary", async () => {
  const [files, language, shell] = await Promise.all([
    readSource("../src/modules/FilesManagerModule.tsx"),
    readSource("../src/context/LanguageContext.tsx"),
    readSource("../src/components/MasterShell.tsx")
  ]);
  assert.match(files, /<PrototypeNotice label=\{t\("collab\.badge\.local_demo"\)\}>\{t\("file\.prototype\.notice"\)\}<\/PrototypeNotice>/);
  assert.match(files, /grid min-w-0 grid-cols-\[3rem_minmax\(0,1fr\)\] gap-2 min-\[360px\]:grid-cols-\[3\.75rem_minmax\(0,1fr\)\] sm:grid-cols-\[12rem_minmax\(0,1fr\)\] sm:gap-4 lg:grid-cols-\[14rem_minmax\(0,1fr\)\]/);
  assert.match(files, /flex flex-wrap items-start justify-between gap-x-2 gap-y-1 px-3 py-2\.5[\s\S]*?file\.meta\.document_id[\s\S]*?file\.meta\.classification/);
  assert.match(files, /flex flex-wrap items-start justify-between gap-3 border-b border-theme pb-3/);
  assert.match(files, /role="tablist" aria-label=\{t\("file\.section\.folders"\)\} aria-orientation="vertical"/);
  assert.match(files, /role="tab"[\s\S]*?aria-selected=\{selected\}[\s\S]*?aria-controls="files-folder-panel"/);
  assert.match(files, /grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3/);
  assert.match(files, /aria-labelledby="files-preview-heading"/);
  assert.match(files, /aria-labelledby="files-folders-heading"/);
  assert.match(files, /aria-pressed=\{isSelected\}/);
  assert.match(files, /aria-expanded=\{filtersOpen\}/);
  assert.match(files, /<DataTableFrame title=\{t\("file\.section\.library"\)\}/);
  assert.match(files, /className=\{`\$\{inlineFormControlClassName\} w-full ps-9 sm:w-56`\}/);
  assert.match(files, /<DocMakerModule[\s\S]*?onSaveToVault=\{saveDocumentToVault\}[\s\S]*?onReturnToFiles=/);
  assert.match(files, /folder: "DOCMAKER"/);
  assert.match(language, /"file\.folder\.DOCMAKER": "Documents"/);
  assert.match(language, /"file\.folder\.DOCMAKER": "المستندات"/);
  assert.match(shell, /canOpenDocMaker=\{moduleToggles\.docMakerEnabled && hasPermission\("route:doc_maker"\)\}/);
  assert.doesNotMatch(shell, /key: "doc_maker" as ModuleRouteKey/);
  assert.doesNotMatch(shell, /activeRoute === "doc_maker"/);
  assert.equal(language.match(/"file\.prototype\.notice":/g)?.length, 2);
  assert.match(language, /seeded entries are metadata only/);
  assert.match(language, /السجلات الأولية بيانات وصفية فقط/);
  for (const key of [
    "file.search.placeholder",
    "file.filter.classification",
    "file.view.grid",
    "file.section.folders",
    "file.btn.new_document",
    "doc.action.back_to_files",
    "file.preview.title",
    "file.meta.integrity"
  ]) {
    assert.equal(language.match(new RegExp(`"${key.replaceAll(".", "\\.")}":`, "g"))?.length, 2, `${key} should be translated in English and Arabic`);
  }
});

test("Doc Maker distinguishes local drafts from government filing or signed records and returns to Files after saving", async () => {
  const [docMaker, files, language] = await Promise.all([
    readSource("../src/modules/DocMakerModule.tsx"),
    readSource("../src/modules/FilesManagerModule.tsx"),
    readSource("../src/context/LanguageContext.tsx")
  ]);
  assert.match(docMaker, /<PrototypeNotice label=\{t\("collab\.badge\.local_demo"\)\}>\{t\("doc\.prototype\.notice"\)\}<\/PrototypeNotice>/);
  assert.match(docMaker, /onReturnToFiles &&[\s\S]*?doc\.action\.back_to_files/);
  assert.match(docMaker, /folder: "DOCMAKER"/);
  assert.match(docMaker, /onSaveToVault\(created\);[\s\S]*?if \(onReturnToFiles\) \{\s*onReturnToFiles\(\);\s*return;/);
  assert.match(files, /const saveDocumentToVault = \(file: VaultFileItem\) => \{[\s\S]*?setDocumentSavedNotice\(true\);/);
  assert.match(files, /documentSavedNotice && \([\s\S]*?role="status" aria-live="polite"[\s\S]*?t\("doc\.status\.saved"\)/);
  assert.match(docMaker, /Files workspace draft/);
  assert.match(docMaker, /grid min-w-0 gap-3 border-b border-theme bg-surface p-3 sm:p-4 xl:grid-cols-\[minmax\(0,1fr\)_auto\] xl:items-end/);
  assert.match(docMaker, /grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 xl:flex xl:items-stretch xl:justify-end/);
  assert.match(docMaker, /min-w-0 border border-theme px-3 py-2 xl:min-w-\[10rem\] xl:flex-1/);
  assert.match(docMaker, /grid min-w-0 grid-cols-1 gap-2 border-b border-theme bg-surface-elevated px-3 py-2 xl:grid-cols-\[minmax\(0,1fr\)_auto\] xl:items-center/);
  assert.match(docMaker, /border-t border-theme pt-2 xl:ms-0 xl:border-t-0 xl:pt-0/);
  assert.equal(language.match(/"doc\.prototype\.notice":/g)?.length, 2);
  assert.match(language, /not signed or filed with Qiwa, ZATCA/);
  assert.match(language, /ولا تُوقّع أو تُقدّم إلى قوى أو زاتكا/);
});

test("Settings labels role and module controls as prototype-only, not production access control", async () => {
  const [settings, language] = await Promise.all([
    readSource("../src/modules/MasterSettingsModule.tsx"),
    readSource("../src/context/LanguageContext.tsx")
  ]);
  assert.match(settings, /<PrototypeNotice label=\{t\("collab\.badge\.local_demo"\)\}>\{t\("settings\.prototype\.notice"\)\}<\/PrototypeNotice>/);
  assert.equal(language.match(/"settings\.prototype\.notice":/g)?.length, 2);
  assert.match(language, /not server-enforced authorization or live integrations/);
  assert.match(language, /وليست صلاحيات مفروضة من الخادم أو تكاملات فعلية/);
});
