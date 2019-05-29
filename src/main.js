'use strict';

import { MouseEventWrapper } from './MouseEventWrapper';
import { audiocontext, load } from './audio';
import { setupHls } from './video';

async function setup() {
  if (audiocontext.state !== 'running') {
    await audiocontext.resume();
  }

  document.removeEventListener(MouseEventWrapper.START, setup, false);
}

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener(MouseEventWrapper.START, setup, false);
  setupHls();
  load();
}, true);
