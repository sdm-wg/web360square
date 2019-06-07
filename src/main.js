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
    document.getElementById('loading-page').classList.add('-hidden');
    document.getElementById('front-page').classList.remove('-hidden');
  });

  document.body.requestFullscreen = document.body.requestFullscreen || document.body.webkitRequestFullscreen;
  document.exitFullscreen         = document.exitFullscreen || document.webkitExitFullscreen;

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

    // HACK: リサイズすると Clickable になることを利用して, フルスクリーン -> フルスクリーン解除する
    setTimeout(() => {
      const promise = document.body.requestFullscreen();

      if (promise === undefined) {
        document.exitFullscreen();
      } else {
        promise
          .then(() => {
            document.exitFullscreen();
          })
          .catch(() => {
            // TODO: エラーハンドリング
          });
      }
    }, 250);
  }, false);

  document.querySelector('a[href="#jazz"]').addEventListener(MouseEventWrapper.CLICK, (event) => {
    // `onpopstate` が発火しないようにする
    event.preventDefault();

    front.classList.add('-hidden');
    concert.classList.add('-hidden');
    jazz.classList.remove('-hidden');

    history.pushState(null, null, `${location.pathname}#/jazz`);

    // HACK: リサイズすると Clickable になることを利用して, フルスクリーン -> フルスクリーン解除する
    setTimeout(() => {
      const promise = document.body.requestFullscreen();

      if (promise === undefined) {
        document.exitFullscreen();
      } else {
        promise
          .then(() => {
            document.exitFullscreen();
          })
          .catch(() => {
            // TODO: エラーハンドリング
          });
      }
    }, 250);
  }, false);

  window.addEventListener('popstate', () => {
    concert.classList.add('-hidden');
    jazz.classList.add('-hidden');
    front.classList.remove('-hidden');
  }, false);
}, true);
