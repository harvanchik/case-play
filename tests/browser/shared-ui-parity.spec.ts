import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
import {join} from 'node:path';
test('shared shell, editor and annotation visual reference',async({page})=>{
 test.skip(!process.env.SHARED_UI_PARITY_DIR,'Set SHARED_UI_PARITY_DIR to capture a before/after reference.');
 const directory=join(process.env.SHARED_UI_PARITY_DIR!,process.env.SHARED_UI_PARITY_MODE??'after');await mkdir(directory,{recursive:true});
 await page.goto('/diagram/flag-football');await page.waitForSelector('.tutorial-launch-bouncing');const consent=page.getByRole('button',{name:/^Essential Cookies Only/});if(await consent.isVisible())await consent.click();await page.evaluate(()=>document.fonts.ready);
 const root=page.locator('section[aria-label="Flag football play builder"]');
 const capture=async(name:string,locator=root)=>{await page.mouse.move(2,2);await page.waitForTimeout(250);await locator.screenshot({path:join(directory,name+'.png'),animations:'disabled'});};
 await page.getByRole('button',{name:'Set up default play',exact:true}).click();await capture('static');
 await page.getByRole('button',{name:'Add another play',exact:true}).click();await page.getByRole('button',{name:'Set up default play',exact:true}).click();await capture('plays');
 await page.keyboard.press('v');const marker=page.locator('[data-layer-type="marker"][data-field-kind="team-a"]').first();await marker.dblclick();await capture('element');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Animate play',exact:true}).click();await page.getByRole('button',{name:'Add animation step',exact:true}).click();const box=(await marker.boundingBox())!;await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+80,box.y+box.height/2-30,{steps:8});await page.mouse.up();await capture('animation',page.locator('.animation-dock'));await capture('movement');
 await page.locator('[data-animation-route] path[pointer-events="stroke"]').first().dispatchEvent('dblclick');await capture('motion');await page.keyboard.press('Escape');
 await page.locator('[data-tutorial-tool="laser"]').click({button:'right'});await capture('laser-palette');await page.keyboard.press('Escape');await page.keyboard.press('Control+Shift+l');const field=(await page.locator('svg[role="application"]').boundingBox())!;await page.mouse.move(field.x+field.width*.4,field.y+field.height*.4);await page.mouse.down();await page.mouse.move(field.x+field.width*.6,field.y+field.height*.5,{steps:8});await page.mouse.up();await capture('spotlight');
 await page.keyboard.press('v');await page.waitForTimeout(600);await page.keyboard.press('F11');await page.getByRole('button',{name:'Open presentation timeline',exact:true}).click();await expect(page.locator('.presentation-mode')).toBeVisible();await capture('fullscreen',page.locator('.presentation-mode'));
});

