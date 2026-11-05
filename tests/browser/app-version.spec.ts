import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

test('shared footers display the package version immediately after privacy choices',async({page})=>{
 const {version}=JSON.parse(readFileSync('package.json','utf8'));
 for(const route of ['/','/about','/contact','/privacy','/cookie-policy','/account/login','/admin/login','/diagram/flag-football','/diagram/flag-football/social-preview','/diagram/flag-football/not-a-real-play','/does-not-exist']){
  await page.goto(route);
  const footer=page.locator('[data-public-site-footer]');await expect(footer,route).toHaveCount(1);
  await expect(footer.locator('[data-app-version]'),route).toHaveText(`v${version}`);
  expect(await footer.getByRole('button',{name:'Your Privacy Choices',exact:true}).evaluate(node=>node.nextElementSibling?.textContent?.trim()),route).toBe(`v${version}`);
 }
});
