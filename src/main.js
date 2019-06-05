'use strict';

import { MouseEventWrapper } from './MouseEventWrapper';
import { audiocontext, load } from './audio';

async function setup() {
  if (audiocontext.state !== 'running') {
    await audiocontext.resume();
  }

  document.removeEventListener(MouseEventWrapper.START, setup, false);
}

document.addEventListener('DOMContentLoaded', () => {
  document.addEventListener(MouseEventWrapper.START, setup, false);
  load();

  const front   = document.getElementById('front-page');
  const concert = document.getElementById('concert');
  const pops    = document.getElementById('pops');

  document.querySelector('a[href="#concert"]').addEventListener(MouseEventWrapper.CLICK, (event) => {
    // `onpopstate` が発火しないようにする
    event.preventDefault();

    front.classList.add('-hidden');
    pops.classList.add('-hidden');
    concert.classList.remove('-hidden');

    history.pushState(null, null, '/#/concert');
  }, false);

  document.querySelector('a[href="#pops"]').addEventListener(MouseEventWrapper.CLICK, (event) => {
    // `onpopstate` が発火しないようにする
    event.preventDefault();

    front.classList.add('-hidden');
    concert.classList.add('-hidden');
    pops.classList.remove('-hidden');

    history.pushState(null, null, '/#/pops');
  }, false);

  window.addEventListener('popstate', () => {
    concert.classList.add('-hidden');
    pops.classList.add('-hidden');
    front.classList.remove('-hidden');
  }, false);
}, true);
