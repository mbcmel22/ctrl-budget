const { chromium } = require('playwright');
const { spawn } = require('child_process');
const [html, outDir] = process.argv.slice(2);
const FPS = 30, N = 90 * FPS, W = 4;
(async () => {
  const b = await chromium.launch();
  const jobs = [];
  for (let w = 0; w < W; w++) jobs.push((async () => {
    const a = Math.floor(N * w / W), z = Math.floor(N * (w + 1) / W);
    const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
    p.on('pageerror', e => console.log('ERR', e.message));
    await p.goto('file://' + html); await p.evaluate(() => window.ready);
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', `${outDir}/part${w}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = a; i < z; i++) {
      await p.evaluate(t => window.frame(t), i / FPS);
      const buf = await p.screenshot({ type: 'jpeg', quality: 93 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 150 === 0) console.log('frame', i);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  })());
  await Promise.all(jobs);
  const p = await b.newPage(); await p.goto('file://' + html); await p.evaluate(() => window.ready);
  require('fs').writeFileSync(outDir + '/sfx.json', JSON.stringify(await p.evaluate(() => window.sfxList())));
  await b.close();
})();
