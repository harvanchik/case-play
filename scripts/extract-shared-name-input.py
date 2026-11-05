from pathlib import Path
import re
p=Path('src/lib/components/FlagFootballPlayBuilder.svelte');s=p.read_text(encoding='utf-8')
s=s.replace('<script lang="ts">',"<script lang=\"ts\">\n import ElementNameInput from './play-builder/ElementNameInput.svelte';",1)
def replace(m):
 text=m.group().replace('<input','<ElementNameInput',1).replace('bind:this=','bind:element=').replace('aria-label=','label=')
 if 'editInput}' in text:
  text=re.sub(r'\s*class:w-40=\{[^}]*\}|\s*class:w-full=\{[^}]*\}', '',text)
  text=re.sub(r'class="([^"]*)"',lambda c: "className={'"+c[1]+"'+(!isTeamMarker(editingMarker)&&editingMarker.kind!=='deflag'&&editingMarker.kind!=='bean-bag'?' w-40':' w-full')}",text)
 else:text=text.replace('class=','className=')
 return text
s=re.sub(r'<input\s+bind:this=\{(?:editInput|teamBoxEditInput)\}.*?/>',replace,s,flags=re.S)
p.write_text(s,encoding='utf-8')
