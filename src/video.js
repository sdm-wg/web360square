import Hls from 'hls.js';

const playlistfile = './assets/video/video.m3u8';
// const playlistfile = 'http://shin.hongo.wide.ad.jp:50080/video/billboard1_er/video.m3u8';

alert('1');
alert('2');

let timerId = null;

export const setupHls = () => {
  if (Hls.isSupported()) {
    const hls = new Hls();

    hls.loadSource(playlistfile);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      // playVideo();
      console.log('video is ready');
    });
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = playlistfile;

    video.addEventListener('loadedmetadata', () => {
      // playVideo();
      console.log('video is ready');
    });
  }
};

// video.play()でPromiseがrejectされる場合（音声が必要な場合など）の対策
// 1秒ごとに再生を試みる（クライアントが何らかの操作を加えると再生できるようになる）
export const playVideo = () => {
  const promise = video.play();

  if (promise !== undefined) {
    promise.then(() => {
      clearTimeout(timerId);
      timerId = null;
    }).catch(() => {
      timerId = setTimeout(playVideo, 1000);
    });
  }
};

// const mediaCurrTime = (media, str) => {
//   console.log(`${str} CURRENT TIME: ${media.currentTime}`);
//   setTimeout(() => { mediaCurrTime(media, str) }, 1000);
// };
