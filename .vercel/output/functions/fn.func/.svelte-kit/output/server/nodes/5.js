import * as server from '../entries/pages/upload/_page.server.ts.js';

export const index = 5;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/upload/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/upload/+page.server.ts";
export const imports = ["_app/immutable/nodes/5.DXI6BjwT.js","_app/immutable/chunks/scheduler.CgBBAKBP.js","_app/immutable/chunks/index.Cgy-Akf-.js","_app/immutable/chunks/mark.B12ovCRP.js","_app/immutable/chunks/_commonjsHelpers.BosuxZz1.js"];
export const stylesheets = [];
export const fonts = [];
