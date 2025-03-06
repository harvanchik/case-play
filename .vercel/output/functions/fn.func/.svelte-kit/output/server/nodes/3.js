import * as server from '../entries/pages/c/_casePlayId_/_page.server.ts.js';

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/c/_casePlayId_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/c/[casePlayId]/+page.server.ts";
export const imports = ["_app/immutable/nodes/3.Bbh4Wg4b.js","_app/immutable/chunks/scheduler.CgBBAKBP.js","_app/immutable/chunks/index.Cgy-Akf-.js","_app/immutable/chunks/mark.B12ovCRP.js","_app/immutable/chunks/_commonjsHelpers.BosuxZz1.js"];
export const stylesheets = [];
export const fonts = [];
