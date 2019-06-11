import Hls from 'hls.js';

const playlistfiles = {
  concert: 'https://sdm.hongo.wide.ad.jp/~shin/assets/video/hls/360square-keio-orche2/video.m3u8',
  jazz   : 'https://sdm.hongo.wide.ad.jp/~shin/assets/video/hls/billboard1_er/video.m3u8'
};

const videos = { concert: null, jazz: null };

document.addEventListener('DOMContentLoaded', () => {
  videos.concert = document.getElementById('concert-video');
  videos.jazz    = document.getElementById('jazz-video');
}, true);

export const setupHls = (genre) => {
  if (Hls.isSupported()) {
    const hls = new Hls();

    hls.loadSource(playlistfiles[genre]);
    hls.attachMedia(videos[genre]);
  } else if (videos[genre].canPlayType('application/vnd.apple.mpegurl')) {
    videos[genre].src = playlistfiles[genre];
    videos[genre].load();
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

// HACK: 映像を（ゆるく）同期するために映像の再生速度を調整
export const looseSync = (audioCurrentTime, genre) => {
  const videoCurrentTime = videos[genre].currentTime;
  const threshold = 0.1;

  if (audioCurrentTime - videoCurrentTime > threshold) {
    // 映像が音声より threshold 秒遅れたら映像を 2 倍速再生する
    videos[genre].playbackRate = 2;
  } else if (videoCurrentTime - audioCurrentTime > threshold) {
    // 映像が音声より threshold 秒早くなったら映像を 0.5 倍速再生する
    videos[genre].playbackRate = 0.5;
  } else {
    // 映像と音声のズレが threshold 秒以下なら映像は等速再生する
    videos[genre].playbackRate = 1;
  }
};
