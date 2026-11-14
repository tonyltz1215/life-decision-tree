/* new-tree.js - 新建一棵树的安全清理（纯逻辑，可注入 adapter 做负向测试）
 * 2026-11-11 修：原实现写快照失败也照删（盲评 P0）。现在：任一快照写失败 → 不删任何东西；
 * 读不到的文件视为「本来就没有」，不阻塞；demo 的 run-demo.json 一并纳入。
 */
'use strict';
const FILES = ['person-model.json', 'memory.json', 'run.json', 'run-demo.json', 'interview-draft.json'];
async function clearTree(ad, dir) {
  const saved = []; const skipped = []; const failed = [];
  for (const f of FILES) {
    let raw = null;
    try { raw = await ad.read('.ldt/' + f); } catch (e) { skipped.push(f); continue; }
    try { await ad.write(dir + '/' + f, raw); saved.push(f); } catch (e2) { failed.push(f); }
  }
  if (failed.length) { return { ok: false, saved: saved, skipped: skipped, failed: failed, removed: [] }; }
  const removed = [];
  for (const f of FILES) { try { await ad.remove('.ldt/' + f); removed.push(f); } catch (e) { } }
  return { ok: true, saved: saved, skipped: skipped, failed: [], removed: removed };
}
module.exports = { FILES: FILES, clearTree: clearTree };
