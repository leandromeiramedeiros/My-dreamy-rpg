// M3 hot-fix debug: list portals / chests / boss-chest geometry near a point. node tools/qa/dbg-objs.js <map> x y r
const { launch } = require('./lib');
(async () => {
  const [map, X, Y, R] = [process.argv[2] || 'pinewood', +process.argv[3], +process.argv[4], +process.argv[5] || 12];
  const { br, page } = await launch({ query: '?map=' + map });
  const r = await page.evaluate(([X, Y, R]) => {
    const m = G.map, near = o => Math.hypot(o.x - X, o.y - Y) < R;
    return { portals: (m.portals || []).filter(near).map(p => ({ id: p.id, x: +p.x.toFixed(2), y: +p.y.toFixed(2), r: p.r, open: p.open, to: p.to })),
      objs: (m.objects || []).filter(o => near(o) && (o.chest || o.label || o.interact)).map(o => ({ t: o.t || o.type, label: o.label, x: +o.x.toFixed(2), y: +o.y.toFixed(2), chest: !!o.chest })) };
  }, [X, Y, R]);
  console.log(JSON.stringify(r, null, 1)); await br.close();
})();
