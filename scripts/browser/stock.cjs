// Read-only local demo recipe; never writes or resets the shared stock.
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');const binary=require('@sparticuz/chromium').default;
const origin=process.env.BESTPHARMA_UI_URL||'http://127.0.0.1:3000';
if(!['127.0.0.1','localhost','[::1]'].includes(new URL(origin).hostname))throw Error('Local demo origin only.');
const tabs=['overview','produits','lots','fefo','emplacements','mouvements','reception','scan','inventaires','peremptions','quarantaine','dechets','valorisation'];
(async()=>{const browser=await chromium.launch({args:binary.args,executablePath:process.env.CHROMIUM_EXECUTABLE||await binary.executablePath(),headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const tab of tabs){await page.goto(origin+'/dashboard/stock?tab='+tab);await page.locator(`[data-stock-dashboard="${tab}"]`).waitFor({state:'attached'});assert.equal(await page.locator('.stock-tabs').count(),0);assert.equal(await page.locator('h1').count(),1)}
 await page.goto(origin+'/dashboard/stock?tab=fefo');await page.locator('.fefo-queue').first().waitFor();assert.equal(await page.locator('table').count(),0);
 await page.goto(origin+'/dashboard/stock?tab=quarantaine');await page.locator('.quarantine-column').first().waitFor();assert.equal(await page.locator('.quarantine-column').count(),2);
 await page.locator('.quarantine-column button').first().click();await page.getByRole('dialog').waitFor();await page.getByRole('button',{name:'Fermer',exact:true}).last().click();
 await page.setViewportSize({width:390,height:844});await page.goto(origin+'/dashboard/stock?tab=emplacements');await page.locator('.location-card').first().waitFor();assert.equal(await page.locator('.stock-tabs').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS: 13 independent stock workspaces; no repeated tab bar; FEFO queue, recall columns, lot modal and mobile location cards; zero JavaScript errors.');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
