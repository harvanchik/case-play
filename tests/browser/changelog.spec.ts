import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';

test('footer version opens readable release notes with distinct product sections on desktop and mobile',async({page})=>{
 await mkdir('test-results-changelog',{recursive:true});
 const {version}=JSON.parse(readFileSync('package.json','utf8'));
 await page.goto('/about');
 const consent=page.getByRole('button',{name:/^Essential Cookies Only/});await expect(consent).toBeVisible();await consent.click();
 const link=page.locator('[data-public-site-footer] [data-app-version]');await expect(link).toHaveAttribute('href',`/changelog#v${version}`);await link.click();
 await expect(page).toHaveURL(new RegExp(`/changelog#v${version.replaceAll('.','\\.')}$`));
 await expect(page.getByRole('heading',{level:1,name:'What’s New',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{level:2,name:`v${version}`,exact:true})).toBeVisible();await expect(page.getByText('Latest',{exact:true})).toHaveCount(1);
 await expect(page.getByRole('region',{name:'Play Builder updates in v1.1.0',exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Case Plays updates in v1.1.0',exact:true})).toBeVisible();
 await expect(page.locator('[data-public-site-footer]')).toHaveCount(1);
 await page.goto('/changelog');await page.screenshot({path:'test-results-changelog/desktop.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await expect(page.getByRole('heading',{level:2,name:`v${version}`,exact:true})).toBeVisible();
 await page.screenshot({path:'test-results-changelog/mobile.png',fullPage:true});
 const bottom=page.locator('[data-public-site-footer] [data-app-version]');await bottom.scrollIntoViewIfNeeded();await expect(bottom).toBeInViewport();
});
