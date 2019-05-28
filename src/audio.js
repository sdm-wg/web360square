import AFRAME from 'aframe';
import { setupHls, playVideo, pauseVideo, setCurrentTime } from './video';

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
          // 時間信号に対する周波数データの応答性 (0 ~ 1)
          // 0 -> 鋭い(瞬時)
          // 1 -> 鈍い
          // default: 0.8
          analysers[i].smoothingTimeConstant = 0.7;

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

// 配列をシャッフルする(boxVecs用)
const arrayShuffle = (arr) => {
  let len = arr.length;

  while (len > 0) {
    const rnd = Math.floor(Math.random() * len);
    const tmp = arr[len - 1];
    arr[len - 1] = arr[rnd];
    arr[rnd] = tmp;
    len--;
  }
};

// 各楽器の ON/OFF
for (let i = 0, len = spriteTimes.length; i < len; i++) {

  // visualizer 関連の変数

  // 黄金比
  const g = (1 + Math.sqrt(5)) / 2;
  // 正二十面体の各頂点           : 12点
  // 正二十面体の各正三角形の重心 : 20点
  // 合わせて32点をvisualizerに用いる
  // 32点の方向ベクトル(yが小さい順に並べる)
  const boxVecs = [
    // y = -g
    [ 1, -g, 0],
    [-1, -g, 0],
    // y = -(2g+1)/3
    [0, -(2 * g + 1) / 3,  g / 3],
    [0, -(2 * g + 1) / 3, -g / 3],
    // y = -1
    [0, -1,  g],
    [0, -1, -g],
    // y = -(g+1)/3
    [ (g + 1) / 3, -(g + 1) / 3,  (g + 1) / 3],
    [ (g + 1) / 3, -(g + 1) / 3, -(g + 1) / 3],
    [-(g + 1) / 3, -(g + 1) / 3, -(g + 1) / 3],
    [-(g + 1) / 3, -(g + 1) / 3,  (g + 1) / 3],
    // y = -g/3
    [ (2 * g + 1) / 3, -g / 3, 0],
    [-(2 * g + 1) / 3, -g / 3, 0],
    // y = 0
    [ g / 3, 0,  (2 * g + 1) / 3],
    [ g, 0,  1],
    [ g, 0, -1],
    [ g / 3, 0, -(2 * g + 1) / 3],
    [-g / 3, 0, -(2 * g + 1) / 3],
    [-g, 0, -1],
    [-g, 0,  1],
    [-g / 3, 0,  (2 * g + 1) / 3],
    // y = g/3
    [ (2 * g + 1) / 3, g / 3, 0],
    [-(2 * g + 1) / 3, g / 3, 0],
    // y = (g+1)/3
    [ (g + 1) / 3, (g + 1) / 3,  (g + 1) / 3],
    [ (g + 1) / 3, (g + 1) / 3, -(g + 1) / 3],
    [-(g + 1) / 3, (g + 1) / 3, -(g + 1) / 3],
    [-(g + 1) / 3, (g + 1) / 3,  (g + 1) / 3],
    // y = 1
    [0, 1,  g],
    [0, 1, -g],
    // y = (2g+1)/3
    [0, (2 * g + 1) / 3,  g / 3],
    [0, (2 * g + 1) / 3, -g / 3],
    // y = g
    [ 1, g, 0],
    [-1, g, 0]
  ];
  const boxEls = [];

  const boxNum = boxVecs.length;
  const boxWidth = 0.15;
  const boxAxis = new THREE.Vector3(0, 1, 0);

  // 有効データのインデックスの上限・下限を記録
  const frequencyIndexRange = { min: null, max: null };

  // 周波数配置を順番通りにする場合は下の行をコメントアウトする
  arrayShuffle(boxVecs);

  AFRAME.registerComponent(`cursor-listener${i}`, {
    init: function() {
      this.el.setAttribute('geometry', {
        primitive: 'sphere',
        radius: 0.6
      });
      this.el.setAttribute('position', positions[i]);
      this.el.setAttribute('scale', { x: scale, y: scale, z: scale });
      // スイッチ本体の opacity は仮で 0
      // ただしスイッチの後ろにある box は描画されない
      this.el.setAttribute('material', {
        color: 'gray',
        transparent: true,
        opacity: 0
      });

      for (let j = 0; j < boxNum; j++) {
        boxEls[j] = document.createElement('a-entity');
        // boxVecs を単位ベクトルに直して更新
        boxVecs[j] = new THREE.Vector3(...boxVecs[j]).normalize();

        const boxHeight = 0.1;
        const boxVec = boxVecs[j];
        const boxEl = boxEls[j];
        boxEl.setAttribute('geometry', {
          primitive: 'box',
          width: boxWidth,
          height: boxHeight,
          depth: boxWidth
        });
        // スイッチの球(半径 0.5 )の中心から boxVec 方向 1 離れた位置に配置
        // boxHeight / 2 は配置の基点を box の中心から box の端に変えるための補正項
        boxEl.setAttribute('position', boxVec.clone().multiplyScalar(boxHeight / 2 + 1));
        boxEl.setAttribute('material', {
          color: 'gray',
          transparent: true,
          opacity: 0.9
        });
        // boxVec 方向に沿って box を回転(球の中心を向く)
        boxEl.object3D.quaternion.setFromUnitVectors(boxAxis, boxVec);

        this.el.append(boxEl);
      }

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

      // スイッチの球本体のエフェクトは一旦消す
      /*
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
      // y = 1 - 2^(-120x) (~= 1 - exp(-80x))
      // x -> 0 付近が約 80 倍に増幅される
      const rate = 1 - (2 ** (-120 * nAverage));

      // ON: 音源に依存して変動 / OFF: 固定値
      const scl = (gains[i].gain.value === 0) ? { x: scale, y: scale, z: scale } : listenerScale(rate);
      const clr = (gains[i].gain.value === 0) ? 'gray' : listenerColor(rate);

      this.el.setAttribute('scale', scl);
      this.el.setAttribute('material', 'color', clr);
      */

      // 周波数データを取得(それぞれ 0 ~ 255 の数値)
      const data = new Uint8Array(analysers[i].frequencyBinCount);
      analysers[i].getByteFrequencyData(data);

      // 有効データの下限を更新
      if (frequencyIndexRange.min === null) {
        frequencyIndexRange.min = analysers[i].frequencyBinCount - 1;
      }

      for (let j = 0; j < frequencyIndexRange.min; j++) {
        if (data[j] !== 0) {
          frequencyIndexRange.min = j;
          break;
        }
      }

      // 有効データの上限を更新
      if (frequencyIndexRange.max === null) {
        frequencyIndexRange.max = 0;
      }

      for (let j = analysers[i].frequencyBinCount - 1; j > frequencyIndexRange.max; j--) {
        if (data[j] !== 0) {
          frequencyIndexRange.max = j;
          break;
        }
      }

      // 周波数データの両端から常に 0 の範囲を除いたものを有効データとする
      // validRange   : 有効データの下限と上限のインデックスの配列
      // validDataSize: 有効データの要素数
      const validRange = (frequencyIndexRange.max - frequencyIndexRange.min < 0) ? { min: 0, max: analysers[i].frequencyBinCount - 1 } : { min: frequencyIndexRange.min, max: frequencyIndexRange.max };
      const validDataSize = validRange.max - validRange.min + 1;

      // 有効データを boxNum 個のグループに分ける
      // chunkSize: 1つのグループに含まれる最低限の要素数
      // chunkRem : 余りの要素数
      const chunkSize = Math.floor(validDataSize / boxNum);
      const chunkRem = validDataSize % boxNum;

      // boxNum 個の各グループごとに平均値をとる
      // さらに平均値を正規化する(0 ~ 1)
      //   0 -> 0
      // 255 -> 1
      for (let j = 0, k = validRange.min; j < boxNum; j++) {
        // j: グループのインデックス
        // k: 有効データのインデックス

        // 1つのグループに含まれる要素数
        const len = (j < chunkRem) ? chunkSize + 1 : chunkSize;

        // グループ内データの和
        let sum = 0;

        for (let l = 0; l < chunkSize; l++) {
          sum += data[k + l];
        }

        // 平均値
        const average = (len === 0) ? 0 : sum / len;

        // 正規化
        const nAverage = average / 255;

        // nAverage が小さいので指数関数でスケーリング
        // x: original rate -> y: scaling rate
        // y = 1 - 2^(-20x) (~= 1 - exp(-14x))
        // x -> 0 付近が約 14 倍に増幅される
        const rate = 1 - (2 ** (-20 * nAverage));

        const boxHeight = (gains[i].gain.value === 0) ? 0.1 : calcHeight(rate);
        const boxColor = (gains[i].gain.value === 0) ? 'gray' : calcColor(rate);

        const boxVec = boxVecs[j];
        const boxEl = boxEls[j];
        boxEl.setAttribute('geometry', 'height', boxHeight);
        boxEl.setAttribute('position', boxVec.clone().multiplyScalar(boxHeight / 2 + 1));
        boxEl.setAttribute('material', 'color', boxColor);

        // 有効データのインデックス更新
        k += chunkSize;
      }
    }
  });
}

// スイッチの球本体のエフェクトは一旦消す
/*
// 各楽器のスイッチの大きさを音源信号の強さに依存して変更
const listenerScale = (rate) => {
  const scl = scale * (1 + rate);
  return { x: scl, y: scl, z: scl };
};
*/

const calcHeight = (rate) => {
  // 高さ 0 を返すと勝手に高さ1(?)ぐらいの box を表示されるので
  // rate が 0.1 未満のときは 0.1 を返す
  return (rate < 0.1) ? 0.1 : rate * 3;
};

// 時間信号 / 周波数信号の強さに依存して変更
// [rate:小] blue < green < yellow < orange < red [rate:大]
const calcColor = (rate) => {
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

      setupHls();

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
