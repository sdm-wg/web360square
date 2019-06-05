import Hls from 'hls.js';

const playlistfiles = {
  concert: 'https://sdm.hongo.wide.ad.jp/~shin/assets/video/hls/360square-keio-orche2/video.m3u8',
  pops   : 'https://sdm.hongo.wide.ad.jp/~shin/assets/video/hls/billboard1_er/video.m3u8'
};

const videos = { concert: null, pops: null };

document.addEventListener('DOMContentLoaded', () => {
  videos.concert = document.getElementById('concert-video');
  videos.pops    = document.getElementById('pops-video');
}, true);

export const setupHls = (genre) => {
  if (Hls.isSupported()) {
    const hls = new Hls();

    hls.loadSource(playlistfiles[genre]);
    hls.attachMedia(videos[genre]);
  } else if (videos[genre].canPlayType('application/vnd.apple.mpegurl')) {
    videos[genre].src = playlistfiles[genre];
  }
};

export const playVideo = async (genre) => {
  try {
    await videos[genre].play();
  } catch (error) {
    // TOD: エラーハンドリング
  }
};

export const pauseVideo = async (genre) => {
  // NOTE: https://developers.google.com/web/updates/2017/06/play-request-was-interrupted
  try {
    await videos[genre].play();
    videos[genre].pause();
  } catch (error) {
    // TODO: エラーハンドリング
  }
};

export const setCurrentTime = (currentTime, genre) => {
  videos[genre].currentTime = currentTime;
};
