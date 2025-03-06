import * as server from '../entries/pages/_page.server.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/+page.server.ts";
export const imports = ["_app/immutable/nodes/2.lx50xVhC.js","_app/immutable/chunks/scheduler.CgBBAKBP.js","_app/immutable/chunks/index.Cgy-Akf-.js","_app/immutable/chunks/each.D6YF6ztN.js","_app/immutable/chunks/entry.BMB3YHA1.js","_app/immutable/chunks/_commonjsHelpers.BosuxZz1.js"];
export const stylesheets = ["_app/immutable/assets/2.BwxPUose.css"];
export const fonts = [];
