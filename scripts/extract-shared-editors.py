from pathlib import Path
import re
root=Path('src/lib');host=root/'components/FlagFootballPlayBuilder.svelte';s=host.read_text(encoding='utf-8')
s=s.replace("import { onMount, tick } from 'svelte';","import { onMount, tick } from 'svelte';\n import { provideElementEditors, useElementEditor } from '$lib/play-builder-element-editor';\n import ElementActionButton from './play-builder/ElementActionButton.svelte';\n const elementEditors=provideElementEditors();\n const elementEditor=useElementEditor();")
# Shared action keeps positioning, dragging and editor exclusivity common without replacing sport fields.
close=['commitDownMarkerEditor','commitTeamBoxEditor','commitMarkerEditor','commitGuideEditor','commitActiveEditor']
matches=list(re.finditer(r'bind:this=\{editorElement\} use:draggablePopover',s))
assert len(matches)==5
for m,fn in reversed(list(zip(matches,close))):
 caps='{label:true,color:true,motion:true,remove:true,revert:true}' if fn=='commitMarkerEditor' else '{label:true,color:true,motion:true}'
 s=s[:m.start()]+f'bind:this={{editorElement}} use:elementEditor={{{{close:{fn},capabilities:{caps}}}}}'+s[m.end():]
# Reuse one action button implementation without moving its positioning containers.
a=s.index('    {#if !viewOnly && !animationPreview && selectedDrawingBounds')
b=s.index('\n\t\t\t</div>',a) # field canvas closing, includes the two action groups
section=s[a:b]
pat=r'<HoverTooltip\s+text=("[^"]*"|\{[^}]*\})(.*?)>\s*<button(.*?)>(.*?)</button>\s*</HoverTooltip>'
def button(m):
 text,tooltipattrs,attrs,child=m.groups()
 aria=re.search(r'aria-label=("[^"]*"|\{[^}]*\})',attrs)
 event=re.search(r'on:pointerdown\|preventDefault\|stopPropagation=\{([^}]+)\}',attrs)
 cls=re.search(r'class="([^"]*)"',attrs)
 if not(aria and event and cls):return m.group()
 wrapper=re.search(r'wrapperClass="([^"]*)"',tooltipattrs)
 bind=' bind:element={deleteButtonElement}' if 'bind:this={deleteButtonElement}' in attrs else ''
 kind='revert' if 'element-revert-button' in cls[1] else 'remove'
 classes=cls[1].replace('element-revert-button','').replace('element-delete-button','').strip()
 return f'<ElementActionButton kind="{kind}" label={aria[1]} tooltip={text} buttonClass="{classes}" wrapperClass="{wrapper[1] if wrapper else ""}" onactivate={{{event[1]}}}{bind}>{child}</ElementActionButton>'
section=re.sub(pat,button,section,flags=re.S)
s=s[:a]+section+s[b:]
s=re.sub(r'\n\t\.element-delete-button:hover,\s*\.element-delete-button:focus-visible\s*\{[^}]*\}\s*\.element-revert-button:hover\s*\{[^}]*\}', '',s)
host.write_text(s,encoding='utf-8')

for filename,options in [
 ('DrawingStylePicker.svelte',"{close:onclose,capabilities:{color:true},outside:true,ignore:'[data-drawing-id],[data-drawing-actions]'}"),
 ('DrawingAnimationPicker.svelte',"{close:onclose,capabilities:{motion:true},outside:true,ignore:'[data-drawing-id],.driver-popover'}"),
 ('AnimationOverlay.svelte',"{close:()=>picker=null,capabilities:{motion:true}}")]:
 p=root/'components/play-builder'/filename;t=p.read_text(encoding='utf-8')
 # AnimationOverlay still needs the element anchor helper.
 t=t.replace('import { draggablePopover }', 'import { draggablePopover }')
 t=t.replace(" import { draggablePopover } from '$lib/play-builder-popover';",'').replace(" import { draggablePopover, rememberPopoverAnchor } from '$lib/play-builder-popover';"," import { rememberPopoverAnchor } from '$lib/play-builder-popover';")
 # Insert only in the instance script, after module script if present.
 t=t.replace('<script lang="ts">',"<script lang=\"ts\">\n import { useElementEditor } from '$lib/play-builder-element-editor';\n const elementEditor=useElementEditor();",1)
 t=t.replace('use:draggablePopover','use:elementEditor={'+options+'}')
 if filename=='DrawingStylePicker.svelte':
  t=re.sub(r'<svelte:window.*?/>\s*','',t,flags=re.S)
 if filename=='DrawingAnimationPicker.svelte':
  t=re.sub(r'\n\tfunction outside\(event: PointerEvent\) \{.*?\n\t\}', '',t,flags=re.S)
  t=re.sub(r'<svelte:window.*?/>\s*','',t,flags=re.S)
 p.write_text(t,encoding='utf-8')
