import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseChangelog} from '../src/lib/changelog';

test('release notes preserve version history and separate product areas',()=>{
 const notes=parseChangelog(readFileSync('CHANGELOG.md','utf8'));
 const {version}=JSON.parse(readFileSync('package.json','utf8'));
 assert.equal(notes[0].version,version);
 assert.equal(notes.filter(release=>release.version===version).length,1);
 const previous=notes.find(release=>release.version==='1.1.0')!;
 assert.equal(previous.date,'2026-11-05');
 assert.ok(previous.sections.some(section=>section.name==='Play Builder'));
 assert.ok(previous.sections.some(section=>section.name==='Case Plays'));
 assert.ok(notes.every(release=>release.sections.every(section=>section.groups.every(group=>group.items.length))));
});

test('curated Markdown supports CRLF, wrapped bullets, and empty category removal as plain text',()=>{
 const notes=parseChangelog('# Changelog\r\n\r\n## v2.0.0 — 2026-11-06\r\nA short summary.\r\n### Play Builder\r\n#### Added\r\n- First part\r\n  continued.\r\n#### Removed\r\n### Case Plays\r\n#### Fixed\r\n- <script>plain text</script>');
 assert.deepEqual(notes[0].summary,['A short summary.']);
 assert.deepEqual(notes[0].sections[0].groups,[{name:'Added',items:['First part continued.']}]);
 assert.equal(notes[0].sections[1].groups[0].items[0],'<script>plain text</script>');
});
