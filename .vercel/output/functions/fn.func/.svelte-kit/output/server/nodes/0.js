

export const index = 0;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_layout.svelte.js')).default;
export const imports = ["_app/immutable/nodes/0.BqQMQETq.js","_app/immutable/chunks/scheduler.CgBBAKBP.js","_app/immutable/chunks/index.Cgy-Akf-.js"];
export const stylesheets = ["_app/immutable/assets/0.a-5t45xx.css"];
export const fonts = [];
