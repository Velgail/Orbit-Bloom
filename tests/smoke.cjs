// Run against the documented static server. Playwright is a development
// tool supplied by the cloud image, never a runtime dependency of the game.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const origin = process.env.ORBIT_TEST_URL || 'http://127.0.0.1:8000';
const state = (page, fn) => page.evaluate(async fn => {
  const {gameState} = await import('/js/game/state.js');
  return Function('s', `return (${fn})(s)`)(gameState);
}, fn.toString());

async function waitState(page, predicate) {
  const deadline = Date.now() + 5000;
  while (Date.now() < deadline) {
    if (await state(page, predicate)) return;
    await page.waitForTimeout(30);
  }
  throw new Error(`State condition timed out: ${predicate}`);
}

(async () => {
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', headless: true, args: ['--no-sandbox']});
  const errors = [];
  let passed = 0;
  async function check(name, test) {
    await test(); passed++; console.log(`PASS ${name}`);
  }
  try {
    const page = await browser.newPage({viewport: {width: 1440, height: 900}});
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => {if(r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);});
    await page.goto(origin);
    await check('title, HTTP modules and actual game loop', async () => {
      await page.locator('#titleScreen').waitFor({state: 'visible'});
      await page.click('#startButton');
      await waitState(page,s=>s.bullets.length>0);
      assert.equal(await state(page, s => s.state), 'playing');
      assert.equal(await state(page, s => s.stars.length), 100);
    });
    await check('movement, dash invulnerability and real cooldown', async () => {
      const x = await state(page, s => s.player.x);
      await page.keyboard.down('d');await page.waitForTimeout(150);await page.keyboard.up('d');
      assert.ok(await state(page, s => s.player.x) > x);
      await page.keyboard.press('Shift');
      assert.ok(await state(page, s => s.player.isInvincible()));
      assert.equal(await state(page, s => s.player.dash()), false);
    });
    await check('pause freezes simulation; resume and mute work', async () => {
      await page.keyboard.press('p');
      const elapsed = await state(page, s => s.elapsedTime);
      await page.waitForTimeout(150);
      assert.equal(await state(page, s => s.elapsedTime), elapsed);
      await page.click('#resumeButton');
      assert.equal(await state(page, s => s.state), 'playing');
      await page.click('#soundButton');
      assert.equal(await page.evaluate(() => localStorage.getItem('orbitBloomMuted')), '1');
    });
    await check('XP drop collection, level selection, frozen time, keyboard choice', async () => {
      await page.evaluate(async () => {
        const s=(await import('/js/game/state.js')).gameState;
        s.xp=5;s.pickups.push({x:s.player.x,y:s.player.y,value:1,age:0});
      });
      await page.locator('#upgradeScreen').waitFor({state:'visible'});
      assert.equal(await page.locator('.upgrade-card:visible').count(), 3);
      assert.equal(await state(page, s => new Set(s.choices.map(c => c.id)).size), 3);
      const time = await state(page, s => s.elapsedTime);
      await page.waitForTimeout(100);
      assert.equal(await state(page, s => s.elapsedTime), time);
      const id = await state(page, s => s.choices[0].id);
      await page.keyboard.press('1');
      assert.equal((await state(page, s => s.upgrades))[id], 1);
      assert.equal(await state(page, s => s.state), 'playing');
    });
    await check('spread shots, drones, shield and faster dash', async () => {
      const results = await page.evaluate(async () => {
        const {gameState:s,startGame}=await import('/js/game/state.js');
        const {updateEvolution}=await import('/js/game/evolution.js');
        startGame();s.upgrades={spread:2,drone:3,dash:2};s.bullets=[];
        s.player.shoot();const shots=s.bullets.length;
        updateEvolution(0.01);const drones=s.bullets.length-shots;
        s.shield=1;s.player.invincibleTimer=0;const lives=s.lives;s.player.hit();
        const shielded=s.lives===lives && s.shield===0;
        s.player.dash();return {shots,drones,shielded,cooldown:s.player.dashCooldownTimer};
      });
      assert.equal(results.shots,5);assert.equal(results.drones,3);assert.equal(results.shielded,true);assert.ok(results.cooldown<1.5);
    });
    await check('combo rewards, graze charge and NOVA clears damaging bullets', async () => {
      const results=await page.evaluate(async () => {
        const {gameState:s,startGame}=await import('/js/game/state.js');
        const {Enemy}=await import('/js/classes/Enemy.js');
        const {Bullet}=await import('/js/classes/Bullet.js');
        const {activateNova}=await import('/js/game/evolution.js');
        const {checkCollisions}=await import('/js/game/collision.js');
        startGame();s.player.invincibleTimer=0;
        s.bullets=[new Bullet(s.player.x+16,s.player.y,0,0,'enemy',100)];
        checkCollisions();const graze=s.nova;checkCollisions();const once=s.nova===graze;
        s.combo=4;s.comboTimer=5;s.nova=100;
        s.enemies=[new Enemy('basic',s.player.x,250,1,s)];
        const fired=activateNova();const result={graze,once,fired,enemies:s.enemies.length,enemyBullets:s.bullets.filter(b=>b.owner==='enemy').length,score:s.score,combo:s.combo,invincible:s.player.isInvincible()};
        result.repeated=activateNova();s.player.dash();result.protection=s.player.invincibleTimer;return result;
      });
      assert.equal(results.graze,37);assert.ok(results.once);assert.ok(results.fired);assert.equal(results.enemies,0);assert.equal(results.enemyBullets,0);assert.equal(results.score,22);assert.equal(results.combo,5);assert.ok(results.invincible);assert.equal(results.repeated,false);assert.ok(results.protection>=0.8);
    });
    await check('boss arrival, two attack patterns, second phase and wave progression', async () => {
      await state(page,s=>{s.elapsedTime=45;s.player.invincibleTimer=20;});
      await waitState(page,s=>!!s.boss);
      const result=await page.evaluate(async()=>{
        const s=(await import('/js/game/state.js')).gameState;
        const b=s.boss;
        const entryHp=b.hp;b.hit(1000);const entryProtected=b.hp===entryHp;
        b.y=115;s.bullets=[];b.shotTimer=0;b.update(0.01);const radial=s.bullets.length;
        s.bullets=[];b.shotTimer=0;b.update(0.01);const aimed=s.bullets.length;
        b.hp=b.maxHp*.4;s.bullets=[];b.shotTimer=0;b.update(0.01);const enraged=s.bullets.length;
        b.hp=1;s.upgrades.damage=1000;
        const {Bullet}=await import('/js/classes/Bullet.js');
        s.bullets=[new Bullet(b.x,b.y,0,0,'player',100)];
        return {entryProtected,radial,aimed,enraged};
      });
      assert.ok(result.entryProtected);assert.equal(result.radial,12);assert.equal(result.aimed,5);assert.equal(result.enraged,16);
      await waitState(page,s=>s.wave===2);
      assert.equal(await state(page,s=>s.boss),null);
      assert.equal(await state(page,s=>s.lives),4);
      assert.equal(await state(page,s=>s.bossSpawned),false);
    });
    await check('endless sector number advances beyond four', async()=>{
      await page.evaluate(async()=>{
        const {gameState:s,startGame}=await import('/js/game/state.js');
        startGame();s.wave=4;s.stageIndex=3;s.bossSpawned=true;s.boss={hp:0};
      });
      await waitState(page,s=>s.wave===5);
      assert.equal(await state(page,s=>s.stageIndex),3);
      assert.match(await page.locator('#time').textContent(),/^05/);
    });
    await check('game over saves best; lockout and restart reset the build', async()=>{
      await page.evaluate(async()=>{
        const s=(await import('/js/game/state.js')).gameState;
        s.score=12345;s.lives=1;s.player.invincibleTimer=0;s.player.hit();
      });
      await page.locator('#gameoverScreen').waitFor({state:'visible'});
      assert.equal(await page.evaluate(()=>localStorage.getItem('orbitBloomHighScore')),'12345');
      assert.ok(await page.locator('#retryButton').isDisabled());
      await page.keyboard.press('Enter');assert.equal(await state(page,s=>s.state),'gameover');
      await page.waitForTimeout(850);await page.click('#retryButton');
      assert.equal(await state(page,s=>s.state),'playing');
      assert.equal(await state(page,s=>s.wave),1);
      assert.deepEqual(await state(page,s=>s.upgrades),{});
      assert.equal(await state(page,s=>s.shield),0);
    });
    await check('phone viewport, touch movement, dash, NOVA and upgrade tap', async()=>{
      const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
      const p=await mobile.newPage();p.on('pageerror',e=>errors.push(e.message));
      await p.goto(origin);await p.tap('#startButton');
      const x=await state(p,s=>s.player.x);
      const session=await p.context().newCDPSession(p);
      await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:75,y:720}]});
      await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:115,y:720}]});
      await p.waitForTimeout(180);
      await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
      assert.ok(await state(p,s=>s.player.x)>x);
      await p.touchscreen.tap(310,764);
      assert.ok(await state(p,s=>s.player.dashCooldownTimer)>0);
      await state(p,s=>{s.nova=100;});await p.waitForTimeout(50);await p.tap('#novaButton');
      assert.ok(await state(p,s=>s.nova)<100);
      await state(p,s=>{s.xp=6;});await p.locator('#upgradeScreen').waitFor({state:'visible'});
      assert.equal(await p.locator('.upgrade-card:visible').count(),3);
      for (const box of await p.locator('.upgrade-card:visible').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}))) {
        assert.ok(box.left>=0 && box.right<=390 && box.top>=0 && box.bottom<=844);
      }
      await p.tap('[data-choice="1"]');assert.equal(await state(p,s=>s.state),'playing');
      await p.setViewportSize({width:844,height:390});
      assert.equal(await p.evaluate(()=>document.querySelector('canvas').width),1688);
      await mobile.close();
    });
    assert.deepEqual(errors,[]);
    console.log(`${passed} functional checks passed; no browser errors.`);
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
