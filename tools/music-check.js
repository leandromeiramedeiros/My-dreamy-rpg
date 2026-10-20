#!/usr/bin/env node
// Audio self-check: opens tools/music-preview.html from file:// in headless Chromium, renders every piece in js/music.js through an
// OfflineAudioContext (the same synth the live preview uses), and fails on any page error, NaN, near-silent output (RMS) or clipping (peak).
// Saves WAVs to tools/shots/audio/*.wav and prints an RMS/peak table.   Usage: node tools/music-check.js [sampleRate=32000]
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const OUT = path.join(__dirname, 'shots', 'audio');
const SR = +process.argv[2] || 32000;
const MIN_RMS = { song: 0.015, motif: 0.01, stinger: 0.004 };   // body RMS (linear); stingers are short and sparse
const MAX_PEAK = 0.98;

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.goto('file://' + path.join(__dirname, 'music-preview.html'));
  const ids = await page.evaluate(() => MusicPreview.ids());
  const problems = await page.evaluate(() => Object.keys(MUSIC).flatMap((id) => MUSIC_UTIL.validate(MUSIC[id], MUSIC_PATCHES).map((p) => id + ': ' + p)));
  const rows = [];
  let failed = problems.length > 0;
  problems.forEach((p) => console.log('DATA PROBLEM', p));
  for (const id of ids) {
    const kind = await page.evaluate((i) => MUSIC[i].kind, id);
    const phases = await page.evaluate((i) => (MUSIC[i].stems ? [0, 1, 2, 3] : [undefined]), id);
    for (const phase of phases) {
      const r = await page.evaluate(async ([i, ph, sr]) => {
        const buf = await MusicPreview.renderSong(i, { phase: ph, sampleRate: sr });
        const st = MusicPreview.bufferStats(buf);
        return { st, wav: MusicPreview.bytesToBase64(MusicPreview.bufferToWav(buf)) };
      }, [id, phase, SR]);
      const label = phase === undefined ? id : `${id}_phase${phase + 1}`;
      const st = r.st;
      const ok = st.bad === 0 && st.rms > MIN_RMS[kind] && st.peak < MAX_PEAK;
      if (!ok) failed = true;
      if (phase === undefined || phase === 0 || phase === 3) fs.writeFileSync(path.join(OUT, label + '.wav'), Buffer.from(r.wav, 'base64'));
      rows.push({ label, kind, sec: st.seconds, rms: st.rms, rmsDb: st.rmsDb, peak: st.peak, peakDb: st.peakDb, ok });
    }
  }
  await browser.close();
  const pad = (s, n) => String(s).padEnd(n);
  console.log(pad('piece', 26) + pad('kind', 9) + pad('sec', 7) + pad('RMS', 9) + pad('RMS dB', 9) + pad('peak', 8) + pad('peak dB', 9) + 'status');
  for (const r of rows) console.log(pad(r.label, 26) + pad(r.kind, 9) + pad(r.sec.toFixed(1), 7) + pad(r.rms.toFixed(4), 9) + pad(r.rmsDb.toFixed(1), 9) + pad(r.peak.toFixed(3), 8) + pad(r.peakDb.toFixed(1), 9) + (r.ok ? 'ok' : 'FAIL'));
  if (errors.length) { failed = true; console.log('ERRORS:\n' + errors.join('\n')); }
  fs.writeFileSync(path.join(OUT, 'stats.json'), JSON.stringify(rows, null, 1));
  console.log(failed ? 'FAILED' : 'PASS: ' + rows.length + ' renders, no errors, none silent, none clipping');
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
