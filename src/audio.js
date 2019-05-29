import AFRAME from 'aframe';
import { playVideo, pauseVideo, setCurrentTime } from './video';

const AudioContext = window.AudioContext || window.webkitAudioContext;

const audiocontext = new AudioContext();
const mastergain   = audiocontext.createGain();
const compressor   = audiocontext.createDynamicsCompressor();
const listener     = audiocontext.listener;

const MAX_VOLUME = 0.5;
const SPRITE_TIME = 194.61224489;
const spriteTimes = [
  { start: 784, end: 784 + SPRITE_TIME },
  { start: 0,   end: SPRITE_TIME },
  { start: 196, end: 196 + SPRITE_TIME }
];

// 音関連の変数
const sources   = [];
const gains     = [];
const panners   = [];
const analysers = [];

// ファイルのON/OFF管理変数は全部offにしておく
const audioStates = [false, false, false];

const prevCurrentTimes = [0, 0, 0];

let audioBuffer = null;

let isPlaying = false;
let isLoading = true;

// 各楽器のスイッチの変数
const positions = [
  { x:    3, y: 0.5, z: -5 },
  { x:   -3, y:   1, z: -5 },
  { x: -0.5, y: 0.7, z: -5 }
];
const scale = 0.3; // 見た目の問題で仮で0.3としておきます

// 音楽を再生するためのスイッチ(色: cyan)を押したときの処理
AFRAME.registerComponent('cursor-listener-switch', {
  init: function() {
    // 'touchstart' では, iOS でイベントが発生しない
    this.el.addEventListener('mousedown', function() {
      if (isLoading) {
        return;
      }

      if (isPlaying) {
        pauseVideo();

        for (let i = 0, len = spriteTimes.length; i < len; i++) {
          sources[i].stop(0);
        }

        this.setAttribute('material', 'color', 'cyan');
        isPlaying = false;
      } else {
        playVideo();

        for (let i = 0, len = spriteTimes.length; i < len; i++) {
          analysers[i] = audiocontext.createAnalyser();

          gains[i] = audiocontext.createGain();
          gains[i].gain.value = MAX_VOLUME;

          panners[i] = audiocontext.createPanner();
          panners[i].panningModel  = 'equalpower';
          panners[i].distanceModel = 'inverse';

          // それぞれの音源の位置を取得して反映
          const pos = document.getElementById(`sphere${i}`);
          const worldPos = new THREE.Vector3();

          worldPos.setFromMatrixPosition(pos.object3D.matrixWorld);

          const { x, y, z } = worldPos;

          panners[i].setPosition(x, y, z);

          // `AudioBufferSourceNode` は使い捨てのノードなので, 停止したあとは再度生成する必要がある
          sources[i] = audiocontext.createBufferSource();
          sources[i].buffer = audioBuffer;

          sources[i].connect(gains[i]);
          gains[i].connect(panners[i]);
          panners[i].connect(analysers[i]);
          analysers[i].connect(mastergain);
          mastergain.connect(compressor);
          compressor.connect(audiocontext.destination);

          sources[i].loop      = true;
          sources[i].loopStart = spriteTimes[i].start;
          sources[i].loopEnd   = spriteTimes[i].end;

          let currentTime = prevCurrentTimes[i] > 0 ? (audiocontext.currentTime - prevCurrentTimes[i]) : 0;

          if (currentTime > SPRITE_TIME) {
              currentTime = 0;
              prevCurrentTimes[i] = 0;
          }

          sources[i].start(0, (spriteTimes[i].start + currentTime), (spriteTimes[i].end - spriteTimes[i].start - currentTime));

          setCurrentTime(currentTime);

          prevCurrentTimes[i] = audiocontext.currentTime;
        }

        this.setAttribute('material', 'color', 'gray');
        isPlaying = true;
      }
    });
  }
});

// 各楽器の ON/OFF
for (let i = 0, len = spriteTimes.length; i < len; i++) {
  AFRAME.registerComponent(`cursor-listener${i}`, {
    init: function() {
      this.el.setAttribute('geometry', 'primitive', 'sphere');
      this.el.setAttribute('position', positions[i]);
      this.el.setAttribute('scale', {x: scale, y: scale, z: scale});
      this.el.setAttribute('material', 'color', 'gray');
      this.el.setAttribute('material', 'transparent', true);
      this.el.setAttribute('material', 'opacity', 0.9);

      // 'touchstart' では, iOS でイベントが発生しない
      this.el.addEventListener('mousedown', function() {
        if (!isPlaying) {
          return;
        }

        if (audioStates[i]) {
          //this.setAttribute('material', 'color', 'rgb(0, 255, 0)');
          gains[i].gain.value = MAX_VOLUME;
          audioStates[i] = false;
        } else {
          //this.setAttribute('material', 'color', 'gray');
          gains[i].gain.value = 0;
          audioStates[i] = true;
        }
      });
    },
    tick: function() {
      if (!analysers[i]) {
        return;
      }

      // 音源の時間データを取得
      const data = new Uint8Array(analysers[i].fftSize);

      // `Uint8Array` と振幅値の対応
      // 0   -> -1
      // 128 ->  0
      // 255 ->  1
      analysers[i].getByteTimeDomainData(data);

      let sum = 0;

      // 振幅の大きさをとりたいので
      // 128 との差の絶対値をとる
      for (let j = 0; j < analysers[i].fftSize; j++) {
        sum += Math.abs(data[j] - 128);
      }

      // 平均値を算出して ... (平均値は 0 ~ 128 に)
      const average = (sum / analysers[i].fftSize);

      // 正規化する (0 ~ 1)
      // 0   -> 0
      // 128 -> 1
      const nAverage = average / 128;

      // rateが小さいので指数関数でスケーリング
      // x: original rate -> y: scaling rate
      // y = 1 - 2^(-120x) (~= 1 - exp(80x))
      // x -> 0 付近が約 80 倍に増幅される
      const rate = 1 - (2 ** (-120 * nAverage));

      // ON: 音源に依存して変動 / OFF: 固定値
      const scl = (gains[i].gain.value === 0) ? { x: scale, y: scale, z: scale } : listenerScale(rate);
      const clr = (gains[i].gain.value === 0) ? 'gray' : listenerColor(rate);

      this.el.setAttribute('scale', scl);
      this.el.setAttribute('material', 'color', clr);
    }
  });
}

// 各楽器のスイッチの大きさを音源信号の強さに依存して変更
const listenerScale = (rate) => {
  const scl = scale * (1 + rate);
  return { x: scl, y: scl, z: scl };
};

// 各楽器のスイッチの色を音源信号の強さに依存して変更
// [rate:小] blue < green < yellow < orange < red [rate:大]
const listenerColor = (rate) => {
  const clr = [0, 0, 0];

  // rate を -1 ~ 1 の値に変換
  // rate =   0 -> -1
  // rate = 0.5 ->  0
  // rate =   1 ->  1
  rate = 2 * rate - 1;

  // r成分
  if (rate < 0) {
    clr[0] = 0;
  } else if (rate >= 0 && rate < 0.5) {
    clr[0] = Math.floor(rate * 2 * 255);
  } else {
    clr[0] = 255;
  }

  // g成分
  if (rate < -0.5) {
    clr[1] = Math.floor((rate + 1.0) * 2 * 255);
  } else if (rate >= -0.5 && rate < 0.5) {
    clr[1] = 255;
  } else {
    clr[1] = 255 - Math.floor((rate - 0.5) * 2 * 255);
  }

  // b成分
  if (rate < -0.5) {
    clr[2] = 255;
  } else if (rate >= -0.5 && rate < 0) {
    clr[2] = 255 - Math.floor((rate + 0.5) * 2 * 255);
  } else {
    clr[2] = 0;
  }

  return `rgb(${clr[0]}, ${clr[1]}, ${clr[2]})`;
};

// camear(listener)の位置と向きを定常的に取得して反映
AFRAME.registerComponent('rotation-reader', {
  tick: function () {
    const object3d = this.el.object3D;
    object3d.updateMatrixWorld();

    const matrixWorld = object3d.matrixWorld;
    const position = new THREE.Vector3().setFromMatrixPosition(matrixWorld);

    listener.setPosition(position.x, position.y, position.z);
    // listener.positionX.value = position.x;
    // listener.positionY.value = position.y;
    // listener.positionZ.value = position.z;

    const mOrientation = matrixWorld.clone();
    mOrientation.setPosition({ x: 0, y: 0, z: 0 });

    const vFront = new THREE.Vector3(0, 0, 1);
    vFront.applyMatrix4(mOrientation);
    vFront.normalize();

    const vUp = new THREE.Vector3(0, -1, 0);
    vUp.applyMatrix4(mOrientation);
    vUp.normalize();

    listener.setOrientation(vFront.x, vFront.y, vFront.z, vUp.x, vUp.y, vUp.z);
    // listener.forwardX = vFront.x;
    // listener.forwardY = vFront.y;
    // listener.forwardZ = vFront.z;
    // listener.upX = vUp.x;
    // listener.upY = vUp.y;
    // listener.upZ = vUp.z;
  }
});

function load() {
  // 音声ファイルを読み込む
  const xhr = new XMLHttpRequest();

  xhr.open('GET', './assets/audio/original.mp3', true);
  xhr.responseType = 'arraybuffer';
  xhr.send(null);

  xhr.onload = () => {
    audiocontext.decodeAudioData(xhr.response, (buffer) => {
      audioBuffer = buffer;

      document.getElementById('sphere-switch').setAttribute('material', 'color', 'cyan');
      isLoading = false;
    }, () => {
      // TODO: エラーハンドリング
    });
  };

  // TODO: エラーハンドリング
  // xhr.onerror = () => {
  // };
}

export { audiocontext, load };
