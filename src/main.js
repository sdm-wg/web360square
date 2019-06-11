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

  load(() => {
    // HTML に最初から `-hidden` をつけてしまうと, clickable にならないので,
    // A-Frame の要素がすべて DOM ツリーに構築されてから `class` 属性を付加する
    concert.classList.add('-hidden');
    jazz.classList.add('-hidden');

    front.classList.remove('-hidden');

    document.getElementById('loading-page').classList.add('-hidden');
  });

  const front   = document.getElementById('front-page');
  const concert = document.getElementById('concert');
  const jazz    = document.getElementById('jazz');

  document.querySelector('a[href="#concert"]').addEventListener(MouseEventWrapper.CLICK, (event) => {
    // `onpopstate` が発火しないようにする
    event.preventDefault();

    front.classList.add('-hidden');
    jazz.classList.add('-hidden');
    concert.classList.remove('-hidden');

    history.pushState(null, null, `${location.pathname}#/concert`);
  }, false);

  document.querySelector('a[href="#jazz"]').addEventListener(MouseEventWrapper.CLICK, (event) => {
    // `onpopstate` が発火しないようにする
    event.preventDefault();

    front.classList.add('-hidden');
    concert.classList.add('-hidden');
    jazz.classList.remove('-hidden');

    history.pushState(null, null, `${location.pathname}#/jazz`);
  }, false);

  window.addEventListener('popstate', () => {
    concert.classList.add('-hidden');
    jazz.classList.add('-hidden');
    front.classList.remove('-hidden');
  }, false);
}, true);
