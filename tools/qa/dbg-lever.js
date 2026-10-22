// M3 hot-fix debug: stand by a lever, press Interact, report the prompt and whether it flipped. node tools/qa/dbg-lever.js [id]
const { launch, sleep } = require('./lib');
(async () => {
  const id = process.argv[2] || 'lever_bridge';
  const { br, page } = await launch({ query: '?map=pinewood' });
  for (const [dx, dy] of [[0, 0.8], [0.8, 0], [-0.8, 0], [0, -0.8]]) {
    const pre = await page.evaluate(([id, dx, dy]) => { const o = G.map.objects.find(q => q.lever && q.src && q.src.id === id); const p = G.player; p.x = o.x + dx; p.y = o.y + dy; p.z = tileH(G.map, p.x, p.y); return { lever: [o.x, o.y, o.z], hero: [p.x, p.y, p.z], walk: walkable(G.map, p.x, p.y, p.z) }; }, [id, dx, dy]);
    await sleep(400);
    const pr = await page.evaluate(() => G.prompt && { kind: G.prompt.kind, x: G.prompt.x, y: G.prompt.y, src: G.prompt.obj.src && G.prompt.obj.src.id });
    await page.keyboard.down('Space'); await sleep(70); await page.keyboard.up('Space'); await sleep(500);
    const post = await page.evaluate(id => { const o = G.map.objects.find(q => q.lever && q.src && q.src.id === id); return { pulled: !!o.pulled, gate: gateOpen(G.map, o.gid), say: G.say && G.say.text }; }, id);
    console.log(JSON.stringify({ dx, dy, pre, prompt: pr, post })); if (post.pulled) break;
  }
  await br.close();
})();
