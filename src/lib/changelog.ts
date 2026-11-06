export type ChangelogGroup={name:string;items:string[]};
export type ChangelogSection={name:string;groups:ChangelogGroup[]};
export type ChangelogRelease={version:string;date?:string;summary:string[];sections:ChangelogSection[]};

/** Read our curated Markdown release notes as text, never executable HTML. */
export function parseChangelog(markdown:string):ChangelogRelease[]{
 const releases:ChangelogRelease[]=[];
 let release:ChangelogRelease|undefined,section:ChangelogSection|undefined,group:ChangelogGroup|undefined;
 for(const raw of markdown.split(/\r?\n/)){
  const line=raw.trim();if(!line)continue;
  const heading=/^## v?(\d+\.\d+\.\d+(?:-[\w.-]+)?)(?:\s+—\s+(\d{4}-\d{2}-\d{2}))?$/.exec(line);
  if(heading){release={version:heading[1],date:heading[2],summary:[],sections:[]};releases.push(release);section=undefined;group=undefined;continue;}
  if(!release)continue;
  if(line.startsWith('### ')){section={name:line.slice(4),groups:[]};release.sections.push(section);group=undefined;continue;}
  if(line.startsWith('#### ')&&section){group={name:line.slice(5),items:[]};section.groups.push(group);continue;}
  const bullet=/^[-*] (.+)$/.exec(line);
  if(bullet&&group){group.items.push(bullet[1]);continue;}
  if(group?.items.length&&!line.startsWith('#'))group.items[group.items.length-1]+=' '+line;
  else if(!section&&!line.startsWith('#'))release.summary.push(line);
 }
 return releases.map(release=>({...release,sections:release.sections.map(section=>({...section,groups:section.groups.filter(group=>group.items.length)})).filter(section=>section.groups.length)}));
}
