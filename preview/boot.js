// Wires the landing-page preview to the app modules that scripts/build_site.py copies in.
import * as scenes from './app/js/scenes.js';
import * as clock from './app/js/clock.js';
import * as watch from './app/js/watchcase.js';
import { playOpening } from './app/js/quitfx.js';

window.TP_scenes = {
  mountScenes: scenes.mountScenes,
  syncScenes: scenes.syncScenes,
  placeSceneRows: scenes.placeSceneRows,
  SCENE_IDS: scenes.SCENE_IDS,
  sceneInfo: scenes.sceneInfo,
  paintFrame: scenes.paintFrame,
  demoRows: scenes.demoRows,
  reviewDetail: scenes.reviewDetail
};
window.TP_clock = {
  appNow: clock.appNow,
  parts: clock.parts,
  dateLabelIn: clock.dateLabelIn,
  hourMinuteIn: clock.hourMinuteIn
};
window.TP_watchcase = { caseSvg: watch.caseSvg, casePalette: watch.casePalette };
window.TP_opening = { run(done) { playOpening(done); } };

function load(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load ' + src));
    document.body.appendChild(script);
  });
}

await load('opening-driver.js');
await load('runtime-driver.js');
