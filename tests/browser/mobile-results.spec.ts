import { test, expect } from '@playwright/test';
import { createClient } from '@libsql/client';
import { randomUUID } from 'node:crypto';

test('mobile results retain complete card heights and scroll without horizontal clipping', async ({ page }, testInfo) => {
 const db=createClient({url:'file:caseplay-animation-test.db'});
 const run=randomUUID();
 const ids=Array.from({length:12},()=>randomUUID());
 try {
  for(const [index,id] of ids.entries()) await db.execute({sql:'INSERT INTO case_plays (id,title,prompt,answer,difficulty,is_hidden,created_at,updated_at) VALUES (?,?,?,?,?,0,?,?)',args:[id,`${run} Completed Pass, Roughing and Taunt ${index}`,'A completed pass is followed by contact near the sideline. Review the sequence and determine the correct ruling for the play.','Test ruling',index%3+1,new Date().toISOString(),new Date().toISOString()]});
  for(const width of [375,640,900]) {
   await page.setViewportSize({width,height:740});
   await page.goto(`/?q=${run}`);
   const consent=page.getByRole('button',{name:/^Essential Cookies Only/});if(await consent.isVisible())await consent.click();
   const grid=page.locator('.auto-rows-max');
   const cards=grid.locator('a[href^="/c/"]');
   await expect(cards).toHaveCount(12);
   expect(await grid.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);
   expect(await grid.evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);
   for(const card of await cards.all()) {
    const box=(await card.boundingBox())!;
    expect(box.height).toBeGreaterThan(80);
    const prompt=(await card.locator('.text-stone-600').boundingBox())!;
    expect(prompt.y+prompt.height).toBeLessThanOrEqual(box.y+box.height);
   }
   if(width===375)await page.screenshot({path:testInfo.outputPath('mobile-results.png')});
  }
 } finally {
  for(const id of ids)await db.execute({sql:'DELETE FROM case_plays WHERE id=?',args:[id]});
  db.close();
 }
});
