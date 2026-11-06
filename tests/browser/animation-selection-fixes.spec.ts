import {perceptualColorTransition} from '../../src/lib/play-builder-color';
import {test,expect,type Page} from '@playwright/test';
import {createAnimation,appendAnimationStep,defaultMotion} from '../../src/lib/play-builder-animation';
import {encodePlayBuilderDocument,defaultPlayBuilderFieldSettings,type PlayBuilderScene} from '../../src/lib/play-builder-scene';

async function ready(page:Page,seed:boolean|'arrow'|'mixed'|'colors'|'image'|'clock'|'clock-ball'=false){
 let url='/diagram/flag-football';
 if(seed){
  const scene:PlayBuilderScene={markers:[{id:1,kind:'team-a',label:'A-1',x:200,y:200},{id:2,kind:'team-b',label:'B-1',x:450,y:300},{id:3,kind:'team-a',label:'A-2',x:700,y:250}],paths:[],guides:[],freeStrokes:[],layerOrder:[{type:'marker',id:1},{type:'marker',id:2},{type:'marker',id:3}]};
  if(seed==='clock'||seed==='clock-ball')scene.guides.push({id:4,kind:'line-of-scrimmage',x:300,color:'white',style:'dashed'});
  if(seed==='image'){scene.markers[2].kind='ball';scene.markers[2].label='Football note';}
  if(seed==='colors'){scene.markers[0].color='red';scene.markers.push({id:6,kind:'deflag',color:'red',x:400,y:400},{id:7,kind:'bean-bag',color:'blue',x:600,y:400});scene.layerOrder.push({type:'marker',id:6},{type:'marker',id:7});scene.freeStrokes.push({id:5,color:'red',points:[{x:500,y:350},{x:600,y:370}]});}
  if(seed==='mixed')scene.freeStrokes.push({id:5,color:'green',points:[{x:500,y:350},{x:600,y:370}]});
  if(seed==='arrow'){scene.paths.push({id:4,kind:'pass',start:{x:100,y:100},end:{x:300,y:100},color:'cyan',style:'dashed'});scene.layerOrder.push({type:'path',id:4});}
  let animation=appendAnimationStep(createAnimation(scene));animation=appendAnimationStep(animation);
  animation.steps[0].poses[2].visible=false;if(seed==='arrow')animation.steps[0].poses.find(pose=>pose.type==='path')!.visible=false;
  for(let i=1;i<3;i++){animation.steps[i].poses[0].x+=100*i;animation.steps[i].poses[1].x+=50*i;}
  if(seed==='colors'){for(const id of [1,6,7])animation.steps[1].poses.find(p=>p.type==='marker'&&p.id===id)!.color=id===7?'pink':'blue';animation.steps[0].strokeOffsets=[{id:5,x:0,y:0,color:'red'}];animation.steps[1].strokeOffsets=[{id:5,x:0,y:0,color:'blue'}];}
  animation.transitions[0].motions=[{...defaultMotion({type:'marker',id:3}),path:'jump',start:.7,jumpEffect:'fade',jumpDuration:.25}];
  if(seed==='clock-ball'){scene.markers[2].kind='ball';animation.steps[0].poses[2].visible=true;animation.steps[1].poses[2].x+=100;animation.steps[2].poses[2].x+=200;for(const transition of animation.transitions)transition.duration=4;animation.transitions[0].motions=[{...defaultMotion({type:'marker',id:3}),start:.5}];}
  const response=await page.request.post('/api/play-builders',{data:{document:encodePlayBuilderDocument({activePlayIndex:0,plays:[{name:'Test',scene,animation,settings:defaultPlayBuilderFieldSettings()}]})}});
  expect(response.status()).toBe(201);const saved=await response.json();
  await page.addInitScript(({id,token})=>localStorage.setItem('caseplay-play-builder-edit-tokens-v1',JSON.stringify({[id]:token})),{id:saved.id,token:saved.editToken});url+=`/${saved.id}`;
 }
 await page.goto(url);await page.waitForSelector('.tutorial-launch-bouncing');const consent=page.getByRole('button',{name:/^Essential Cookies Only/});if(await consent.isVisible())await consent.click();
 if(seed){await page.getByRole('button',{name:'Animate play',exact:true}).click();await page.keyboard.press('2');}
}
const marker=(page:Page,id:number)=>page.locator(`[data-layer-type="marker"][data-layer-id="${id}"]`);
const x=(page:Page,id:number)=>page.locator(`#animation-marker-art-${id} circle`).first().getAttribute('cx');
async function seek(page:Page,time:number){await page.getByRole('slider',{name:'Animation playhead',exact:true}).evaluate((node,time)=>{(node as HTMLInputElement).value=String(time);node.dispatchEvent(new Event('input',{bubbles:true}));},time);}

test('laser and spotlight activate without pointer motion and drawing cursor follows the color',async({page})=>{
 await ready(page);await page.keyboard.press('Shift+l');await expect(page.locator('[data-laser-pointer-layer] circle')).not.toHaveCount(0);
 await page.keyboard.press('Control+Shift+l');await expect(page.locator('[data-spotlight-cursor]')).toHaveCount(1);await expect.poll(()=>page.locator('svg[role="application"]').evaluate(node=>node.lastElementChild?.hasAttribute('data-laser-pointer-layer'))).toBe(true);
 await page.keyboard.press('Shift+l');await expect(page.locator('[data-spotlight]')).toHaveCount(0);await expect(page.locator('[data-laser-pointer-layer] circle')).not.toHaveCount(0);
 await page.keyboard.press('v');await page.keyboard.press('d');await page.getByRole('button',{name:'Blue drawing color',exact:true}).click();
 const cursor=await page.locator('svg[role="application"]').evaluate(node=>getComputedStyle(node).cursor);
 expect(decodeURIComponent(cursor)).toContain('fill="#2979ff"');expect(decodeURIComponent(cursor)).toContain('fill-opacity=".55"');
});

test('new elements wait for departure and disable other motion types; step navigation never loses its SVG parent',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await ready(page,true);
 await marker(page,3).click({button:'right'});const picker=page.locator('[data-animation-path-picker]');await expect(picker.getByRole('button',{name:'Jump',exact:true})).toHaveAttribute('aria-pressed','true');await expect(picker.getByRole('button',{name:'Custom',exact:true})).toBeDisabled();await expect(picker.getByRole('button',{name:'Linear',exact:true})).toBeDisabled();await expect(picker.getByRole('button',{name:'Curved',exact:true})).toBeDisabled();
 await page.keyboard.press('Escape');await seek(page,.69);await expect(marker(page,3)).toHaveCount(0);await seek(page,.8);await expect(marker(page,3)).toHaveCount(1);
 for(let i=0;i<10;i++){await page.keyboard.press('1');await page.keyboard.press('2');}
 expect(errors).toEqual([]);await expect(page.locator('[data-animation-ghost]')).not.toHaveCount(0);
});

test('Backspace reverts a selected group and Delete removes it, with Undo restoring both',async({page})=>{
 await ready(page,true);await page.keyboard.press('v');await page.getByRole('button',{name:'Open Test',exact:true}).focus();await page.keyboard.press('Control+a');await expect(page.getByRole('button',{name:'Revert to original position',exact:true})).toBeVisible();await page.getByRole('button',{name:'Revert options',exact:true}).click();await expect(page.getByRole('menuitem',{name:'Revert These Only',exact:true})).toBeVisible();await page.getByRole('button',{name:'Revert options',exact:true}).click();
 await page.keyboard.press('Backspace');await expect.poll(()=>x(page,1)).toBe('200');await expect.poll(()=>x(page,2)).toBe('450');
 await page.keyboard.press('Control+z');await expect.poll(()=>x(page,1)).toBe('300');await expect.poll(()=>x(page,2)).toBe('500');
 await page.keyboard.press('Control+a');await page.keyboard.press('Delete');await expect(page.locator('[data-layer-type="marker"]')).toHaveCount(0);
 await page.keyboard.press('Control+z');await expect(page.locator('[data-layer-type="marker"]')).toHaveCount(3);
});

test('revert and delete menus can affect only this step or all later steps',async({page})=>{
 await ready(page,true);await page.keyboard.press('v');await marker(page,1).click();await page.getByRole('button',{name:'Revert options',exact:true}).click();await page.getByRole('menuitem',{name:'Revert & Update All Future Steps',exact:true}).click();
 await expect.poll(()=>x(page,1)).toBe('200');await page.keyboard.press('3');await expect.poll(()=>x(page,1)).toBe('200');
 await page.keyboard.press('2');await marker(page,1).click();await page.getByRole('button',{name:'Delete options',exact:true}).click();await page.getByRole('menuitem',{name:'Delete This Only',exact:true}).click();await expect(marker(page,1)).toHaveCount(0);
 await page.keyboard.press('3');await expect(marker(page,1)).toHaveCount(1);
 await marker(page,2).click();await page.getByRole('button',{name:'Delete element',exact:true}).click();await page.keyboard.press('2');await expect(marker(page,2)).toHaveCount(1);
 await marker(page,3).click();await page.getByRole('button',{name:'Delete options',exact:true}).click();await page.getByRole('menuitem',{name:'Delete & Update All Future Steps',exact:true}).click();await page.keyboard.press('3');await expect(marker(page,3)).toHaveCount(0);
});

test('new arrows retain their initial Draw animation option',async({page})=>{
 await ready(page,'arrow');await page.locator('[data-layer-type="path"][data-layer-id="4"]').click({button:'right'});
 const picker=page.locator('[data-animation-path-picker]');await expect(picker.getByRole('button',{name:'Draw',exact:true})).toBeEnabled();await picker.getByRole('button',{name:'Draw',exact:true}).click();await expect(picker.getByRole('button',{name:'Draw',exact:true})).toHaveAttribute('aria-pressed','true');
});

test('body-focus select-all, mixed action bars, dragging and Escape stay coordinated',async({page})=>{
 await ready(page,'mixed');await page.evaluate(()=>{(document.activeElement as HTMLElement)?.blur();});await page.keyboard.press('Control+a');
 await expect(page.locator('[data-selection-wireframe]')).toHaveCount(1);await expect(page.locator('[data-element-actions]')).toHaveCount(1);await expect(page.locator('[data-drawing-actions]')).toHaveCount(0);
 const b=(await marker(page,1).boundingBox())!;await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2+25,b.y+b.height/2+20,{steps:8});
 await expect(page.locator('[data-element-actions],[data-drawing-actions]')).toHaveCount(0);await page.mouse.up();await expect(page.locator('[data-element-actions]')).toHaveCount(1);
 await page.keyboard.press('Escape');await expect(page.locator('[data-selection-wireframe],[data-element-actions],[data-drawing-actions]')).toHaveCount(0);
 const hit=page.locator('[data-drawing-hit]').first();const drawing=(await hit.boundingBox())!;await page.mouse.move(drawing.x+drawing.width/2,drawing.y+drawing.height/2);await page.mouse.down();await page.mouse.move(drawing.x+drawing.width/2+25,drawing.y+drawing.height/2+20,{steps:8});await expect(page.locator('[data-element-actions],[data-drawing-actions]')).toHaveCount(0);await page.mouse.up();await expect(page.locator('[data-drawing-actions]')).toHaveCount(1);await page.keyboard.press('Escape');await expect(page.locator('[data-drawing-actions]')).toHaveCount(0);await page.keyboard.press('Meta+a');await expect(page.locator('[data-selection-wireframe]')).toHaveCount(1);await page.getByRole('button',{name:'Delete options',exact:true}).click();await page.keyboard.press('Escape');await expect(page.locator('[data-element-actions],[data-drawing-actions],[data-element-action-menu]')).toHaveCount(0);
});

test('action dropdown tooltips stay dismissed until pointer re-entry',async({page})=>{
 await ready(page,true);await page.keyboard.press('v');await marker(page,1).click();
 const button=page.getByRole('button',{name:'Revert options',exact:true});await button.hover();await expect(page.getByRole('tooltip')).toContainText('Revert Options');await button.click();await expect(page.getByRole('menuitem',{name:'Revert This Only',exact:true})).toBeVisible();await expect(page.getByRole('tooltip')).toHaveCount(0);
 const b=(await button.boundingBox())!;await page.mouse.move(b.x+b.width/2+1,b.y+b.height/2);await expect(page.getByRole('tooltip')).toHaveCount(0);await page.mouse.move(2,2);await button.hover();await expect(page.getByRole('tooltip')).toContainText('Revert Options');
});

test('spotlight undo restores shaded ghosts without moving the pointer',async({page})=>{
 await ready(page,true);await page.keyboard.press('Control+Shift+l');const field=(await page.locator('svg[role="application"]').boundingBox())!;await page.mouse.move(field.x+field.width*.9,field.y+field.height*.9);
 const ghost=(await page.locator('[data-animation-ghost="1"]').first().boundingBox())!;const clip={x:Math.round(ghost.x),y:Math.round(ghost.y),width:Math.round(ghost.width),height:Math.round(ghost.height)};
 const before=await page.screenshot({clip,animations:'disabled'});await page.mouse.click(ghost.x+ghost.width/2,ghost.y+ghost.height/2);await page.mouse.move(field.x+field.width*.9,field.y+field.height*.9);const lit=await page.screenshot({clip,animations:'disabled'});expect(lit.equals(before)).toBe(false);
 await page.keyboard.press('Control+z');await expect(page.locator('[data-spotlight-stroke]')).toHaveCount(0);await expect.poll(async()=>(await page.screenshot({clip,animations:'disabled'})).equals(before)).toBe(true);
});

test('header dropdown stays above a dock overlapping the header',async({page})=>{
 await ready(page,true);await page.locator('[data-animation-ui]').first().evaluate(node=>{const element=node as HTMLElement;element.style.setProperty('top','35px');element.style.setProperty('bottom','auto');});
 const link=page.getByRole('navigation',{name:'Primary navigation'}).getByRole('link',{name:'Play Builder',exact:true});await link.hover();const menu=page.getByRole('menu',{name:'Play Builder menu',exact:true});await expect(menu).toBeVisible();
 const b=(await menu.boundingBox())!;expect(await page.evaluate(({x,y})=>!!document.elementFromPoint(x,y)?.closest('.nav-dropdown-menu'),{x:b.x+b.width/2,y:b.y+20})).toBe(true);
});

test('player, drawing and fabric colors blend in OKLab without raster dissolves',async({page})=>{
 await ready(page,'colors');await seek(page,.5);
 await expect(page.locator('#animation-marker-art-1 circle').first()).toHaveAttribute('fill',perceptualColorTransition('#ef4444','#2563eb',.5));
 await expect(page.locator('[data-free-drawing]').first()).toHaveAttribute('stroke',perceptualColorTransition('#ff1744','#2979ff',.5));
 for(const id of [6,7]){await expect(page.locator(`#animation-marker-art-${id} image`)).toHaveCount(1);await expect(page.locator(`#animation-marker-art-${id} feColorMatrix`)).toHaveCount(1);}
});

test('dock lock remembers browser-local geometry across closing and reload',async({page})=>{
 await ready(page,true);const dock=page.getByRole('toolbar',{name:'Play animation controls',exact:true});
 const resize=page.getByRole('button',{name:'Resize animation dock from right',exact:true});const edge=(await resize.boundingBox())!;await page.mouse.move(edge.x+edge.width/2,edge.y+edge.height/2);await page.mouse.down();await page.mouse.move(edge.x-80,edge.y+edge.height/2,{steps:8});await page.mouse.up();
 let box=(await dock.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height-10);await page.mouse.down();await page.mouse.move(box.x+box.width/2+45,box.y+box.height-160,{steps:8});await page.mouse.up();
 const saved=(await dock.boundingBox())!;const lock=page.getByRole('button',{name:'Lock animation dock',exact:true});expect(await lock.locator('span').evaluate(node=>getComputedStyle(node).opacity)).toBe('0.4');await lock.click();await expect(page.getByRole('button',{name:'Unlock animation dock',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.getByRole('button',{name:/Resize animation dock/})).toHaveCount(0);
 await page.mouse.move(saved.x+saved.width/2,saved.y+saved.height-10);await page.mouse.down();await page.mouse.move(saved.x+saved.width/2+100,saved.y+saved.height-110,{steps:8});await page.mouse.up();expect((await dock.boundingBox())!.x).toBe(saved.x);
 await page.getByRole('button',{name:'Close animation editor',exact:true}).click();await page.getByRole('button',{name:'Animate play',exact:true}).click();await expect.poll(async()=>(await dock.boundingBox())!.y).toBeCloseTo(saved.y,0);expect((await dock.boundingBox())!.width).toBeCloseTo(saved.width,0);
 await page.evaluate(()=>{for(const key of Object.keys(localStorage))if(key.startsWith('caseplay-play-builder-draft-v1:'))localStorage.removeItem(key);});await page.reload();await expect(page.getByRole('button',{name:'Animate play',exact:true})).toBeVisible();await page.waitForTimeout(750);await page.getByRole('button',{name:'Animate play',exact:true}).click();await expect(page.getByRole('button',{name:'Unlock animation dock',exact:true})).toBeVisible();await expect.poll(async()=>(await dock.boundingBox())!.y).toBeCloseTo(saved.y,0);expect((await dock.boundingBox())!.width).toBeCloseTo(saved.width,0);
 await page.getByRole('button',{name:'Unlock animation dock',exact:true}).click();expect(await page.evaluate(()=>localStorage.getItem('caseplay-animation-dock-v1'))).toBeNull();await expect(page.getByRole('button',{name:/Resize animation dock/})).toHaveCount(2);
});

test('movement routes recover replaced layers and remain visible through step changes',async({page})=>{
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));await ready(page,true);
 const assertRoutes=async()=>{for(const id of [1,2])await expect.poll(()=>page.locator(`[data-animation-route="${id}"] [data-animation-route-line]`).evaluate(node=>node.isConnected&&!!node.closest('[data-animation-route-underlay],[data-animation-selected-overlay]')&&!!node.getAttribute('d'))).toBe(true);};
 await assertRoutes();await page.locator('[data-animation-route-underlay]').evaluate(node=>node.replaceWith(node.cloneNode(false)));await assertRoutes();
 for(let i=0;i<8;i++){await page.keyboard.press('1');await page.keyboard.press('2');await marker(page,1).click();await page.keyboard.press('3');await page.keyboard.press('2');await assertRoutes();}
 expect(errors).toEqual([]);
 const duration=page.locator('.playback-duration');const timeline=page.locator('.playback-timeline');expect((await duration.boundingBox())!.x-((await timeline.boundingBox())!.x+(await timeline.boundingBox())!.width)).toBeGreaterThanOrEqual(8);
});


test('Jump image labels wait for their artwork and share the element transition',async({page})=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve);
 await ready(page,'image');await seek(page,0);
 await page.route('**/images/football.webp',async route=>{await gate;await route.continue();});
 await seek(page,.85);
 const art=page.locator('#animation-marker-art-3');
 await expect(art.locator('image')).toHaveCount(1);await expect(art.locator('text')).toHaveCount(0);
 release();await expect(art.locator('text')).toContainText(/Football\s*note/);
 expect(Number(await art.locator('..').getAttribute('opacity'))).toBeGreaterThan(0);
});


test('play clock is attached beside the LOS marker and counts down with the playhead',async({page})=>{
 await ready(page,'clock');await page.keyboard.press('1');
 const clock=page.locator('[data-los-marker] [data-play-clock]');await expect(clock.locator('text')).toHaveText('25');
 await seek(page,1.5);await expect(clock.locator('text')).toHaveText('24');
 const los=page.locator('[data-los-marker] > rect');const left=await clock.locator('rect').boundingBox();const right=await los.boundingBox();
 expect(left!.height).toBeCloseTo(left!.width,1);expect(left!.x+left!.width).toBeLessThan(right!.x);
 await page.keyboard.press('1');await expect(clock.locator('text')).toHaveText('25');
});


test('play clock toggle and NFL defaults work and settings header buttons match heights',async({page})=>{
 await ready(page);await page.getByRole('button',{name:'Set up default play',exact:true}).click();await page.getByRole('button',{name:'Open field settings',exact:true}).click();
 const revert=page.getByRole('button',{name:'Revert to Defaults',exact:true});const close=page.getByRole('button',{name:'Close settings',exact:true});
 expect((await revert.boundingBox())!.height).toBe((await close.boundingBox())!.height);
 const toggle=page.getByRole('switch',{name:/^Play Clock/});await expect(toggle).toHaveAttribute('aria-checked','true');await toggle.click();await close.click();await expect(page.locator('[data-play-clock]')).toHaveCount(0);
 await page.getByRole('button',{name:'Open field settings',exact:true}).click();await toggle.click();await page.getByRole('radio',{name:/NFL Flag/}).click();await close.click();await page.getByRole('button',{name:'Set up default play',exact:true}).click();await expect(page.locator('[data-los-marker] [data-play-clock] text')).toHaveText('40');
});


test('Start drawings expose animation settings and deleted drawing ghosts can be reverted',async({page})=>{
 await ready(page,'mixed');await page.keyboard.press('v');await page.keyboard.press('1');
 await page.locator('[data-drawing-id="5"]').click({button:'right'});
 const picker=page.locator('[data-drawing-animation-picker]');await expect(picker).toBeVisible();await expect(picker.getByRole('button',{name:'Draw',exact:true})).toBeEnabled();await picker.getByRole('button',{name:'Instant',exact:true}).click();
 await page.keyboard.press('Escape');await page.keyboard.press('2');await page.keyboard.press('v');await page.locator('[data-drawing-hit]').click();await page.keyboard.press('Delete');
 await expect(page.locator('[data-drawing-id="5"]')).toHaveCount(0);await page.locator('[data-drawing-ghost]').first().click();
 await page.getByRole('button',{name:'Revert drawing to original position',exact:true}).click();await expect(page.locator('[data-drawing-id="5"]')).toHaveCount(1);
});

test('play clock edits inline in red without opening LOS properties',async({page})=>{
 await ready(page,'clock');await page.keyboard.press('1');const input=page.getByRole('textbox',{name:'Play clock seconds',exact:true});await input.click();await input.fill('17');await input.press('Enter');
 await expect(page.locator('[data-los-marker] [data-play-clock] text')).toHaveText('17');
 await expect(page.getByRole('textbox',{name:'Line of Scrimmage yard line',exact:true})).toHaveCount(0);
 expect(await page.locator('[data-play-clock] text').evaluate(node=>getComputedStyle(node).fill)).toBe('rgb(255, 23, 68)');
});


test('play clock stops at the first football movement and rewinds deterministically',async({page})=>{
 await ready(page,'clock-ball');const clock=page.locator('[data-los-marker] [data-play-clock] text');
 await seek(page,1);await expect(clock).toHaveText('24');await seek(page,3);await expect(clock).toHaveText('23');await seek(page,7);await expect(clock).toHaveText('23');await seek(page,0);await expect(clock).toHaveText('25');
});
