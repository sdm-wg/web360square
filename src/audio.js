import AFRAME from 'aframe';
import { setupHls, playVideo, pauseVideo, setCurrentTime, looseSync } from './video';
import { GENRES, arrayShuffle, calcHeight, calcColor } from './utils';

const AudioContext = window.AudioContext || window.webkitAudioContext;

const audiocontext = new AudioContext();
const mastergain   = audiocontext.createGain();
const compressor   = audiocontext.createDynamicsCompressor();
const listener     = audiocontext.listener;

const MAX_VOLUME = 0.5;

// コンテンツ依存の定数・変数
const audioFiles = {
  concert: 'https://sdm.hongo.wide.ad.jp/~kawa/asset/keioconcert-audiosprite/kc-64.mp3',
  jazz   : 'https://sdm.hongo.wide.ad.jp/~kawa/asset/billboard2016-audiosprite/bb-64kbps.mp3'
};

const SPRITE_TIMES = {
  concert: 82.088821,
  jazz   : 194.61224489
};

const spriteTimes = {
  concert: [
    { start: 0,    end: SPRITE_TIMES.concert },        // A_1st_Vn
    { start: 88,   end: 88 + SPRITE_TIMES.concert },   // B_Via
    { start: 176,  end: 176 + SPRITE_TIMES.concert },  // C_Vc
    { start: 264,  end: 264 + SPRITE_TIMES.concert },  // D_2nd_Vn
    { start: 352,  end: 352 + SPRITE_TIMES.concert },  // E_Flaut
    { start: 440,  end: 440 + SPRITE_TIMES.concert },  // F_OB_damore
    { start: 528,  end: 528 + SPRITE_TIMES.concert },  // G_Theorbe
    { start: 616,  end: 616 + SPRITE_TIMES.concert },  // H_Fg
    { start: 704,  end: 704 + SPRITE_TIMES.concert }   // Cemb
  ],
  jazz: [
    { start: 392, end: 392 + SPRITE_TIMES.jazz },  // Keyboard
    { start: 0,   end: SPRITE_TIMES.jazz },        // Bass
    { start: 196, end: 196 + SPRITE_TIMES.jazz }   // Drums
  ]
};

// 各楽器のスイッチの位置
const positions = {
  concert: [
    { x:  3.05, y: 1, z: -7.33 }, // A_1st_Vn
    { x:  1.86, y: 1, z: -3.24 }, // B_Via
    { x: -1.58, y: 1, z:  3.18 }, // C_Vc
    { x: -6.36, y: 1, z: -6.79 }, // D_2nd_Vn
    { x:  6.08, y: 1, z: -2.51 }, // E_Flaut
    { x:  5.14, y: 1, z:  1.03 }, // F_OB_damore
    { x: -5.17, y: 1, z:  1.89 }, // G_Theorbe
    { x: -5.77, y: 1, z: -1.29 }, // H_Fg
    { x: -9.19, y: 1, z: -0.91 }  // Cemb
//    { x: -9.19, y: 1, z: -1.41 }  // Cemb
  ],
  jazz: [
    { x:    3, y: 0.5, z: -5 },
    { x:   -3, y:   1, z: -5 },
    { x: -0.5, y: 0.7, z: -5 }
  ]
};

// 音関連の変数
const sources   = { concert: [], jazz: [] };
const gains     = { concert: [], jazz: [] };
const panners   = { concert: [], jazz: [] };
const analysers = { concert: [], jazz: [] };

// ファイルの ON/OFF 管理変数
const audioStates      = { concert: [], jazz: [] };

for (let i = 0, len = spriteTimes.concert.length; i < len; i++) {
  audioStates.concert[i] = false;
}

for (let i = 0, len = spriteTimes.jazz.length; i < len; i++) {
  audioStates.jazz[i] = false;
}

// 音声の再生時間に関する変数
const prevPausedRange = {
  concert: { start: 0, end: 0 },
  jazz   : { start: 0, end: 0 }
};
const pausedTotal = { concert: 0, jazz: 0 };
const currentTime = { concert: 0, jazz: 0 };

const audioBuffer = { concert: null, jazz: null };

const isPlaying = { concert: false, jazz: false };
const isLoading = { concert: true, jazz: true };

// 楽器のスイッチの拡大率
const scale = 0.3; // 見た目の問題で仮で0.3としておきます

// 音楽を再生するためのスイッチ(色: cyan)を押したときの処理
GENRES.forEach((genre) => {
  AFRAME.registerComponent(`${genre}-cursor-listener-switch`, {
    init: function() {
      // 'touchstart' では, iOS でイベントが発生しない
      this.el.addEventListener('mousedown', function() {
        if (isLoading[genre]) {
          return;
        }

        if (isPlaying[genre]) {
          pauseVideo(genre);

          for (let i = 0, len = spriteTimes[genre].length; i < len; i++) {
            sources[genre][i].stop(0);
          }

          this.setAttribute('material', 'color', 'cyan');
          isPlaying[genre] = false;

          prevPausedRange[genre].start = audiocontext.currentTime;
        } else {
          playVideo(genre);

          for (let i = 0, len = spriteTimes[genre].length; i < len; i++) {
            analysers[genre][i] = audiocontext.createAnalyser();
            // 時間信号に対する周波数データの応答性 (0 ~ 1)
            // 0 -> 鋭い(瞬時)
            // 1 -> 鈍い
            // default: 0.8
            analysers[genre][i].smoothingTimeConstant = 0.7;

            gains[genre][i] = audiocontext.createGain();
            gains[genre][i].gain.value = MAX_VOLUME;

            panners[genre][i] = audiocontext.createPanner();
            panners[genre][i].panningModel  = 'equalpower';
            panners[genre][i].distanceModel = 'inverse';

            // それぞれの音源の位置を取得して反映
            const pos = document.getElementById(`${genre}-sphere${i}`);
            const worldPos = new THREE.Vector3();

            worldPos.setFromMatrixPosition(pos.object3D.matrixWorld);

            const { x, y, z } = worldPos;

            panners[genre][i].setPosition(x, y, z);

            // `AudioBufferSourceNode` は使い捨てのノードなので, 停止したあとは再度生成する必要がある
            sources[genre][i] = audiocontext.createBufferSource();
            sources[genre][i].buffer = audioBuffer[genre];

            sources[genre][i].connect(gains[genre][i]);
            gains[genre][i].connect(panners[genre][i]);
            panners[genre][i].connect(analysers[genre][i]);
            analysers[genre][i].connect(mastergain);
            mastergain.connect(compressor);
            compressor.connect(audiocontext.destination);

            sources[genre][i].loopStart = spriteTimes[genre][i].start;
            sources[genre][i].loopEnd   = spriteTimes[genre][i].end;

            sources[genre][i].start(
              0,
              (spriteTimes[genre][i].start + currentTime[genre]),
              (spriteTimes[genre][i].end - spriteTimes[genre][i].start - currentTime[genre])
            );

            // Chrome の場合, `AudioBufferSourceNode#start` に設定しないとループしない
            sources[genre][i].loop = true;
          }

          setCurrentTime(currentTime[genre], genre);

          this.setAttribute('material', 'color', 'gray');
          isPlaying[genre] = true;
        }
      });
    },
    tick: function() {
      if (isLoading[genre]) {
        return;
      }

      if (isPlaying[genre]) {
        if (prevPausedRange[genre].end > 0){
          // pause していた時間がある場合は pausedTotal に加算
          pausedTotal[genre] += prevPausedRange[genre].end - prevPausedRange[genre].start;

          // 初期化
          prevPausedRange[genre].start = 0;
          prevPausedRange[genre].end   = 0;
        }

        // 音声の再生位置を計算
        currentTime[genre] = audiocontext.currentTime - pausedTotal[genre];

        if (currentTime[genre] > SPRITE_TIMES[genre]) {
          // ループして先頭に戻った際の補正
          currentTime[genre] -= SPRITE_TIMES[genre];
          pausedTotal[genre] += SPRITE_TIMES[genre];

          // 音声がループしたときに映像も強制的に先頭に戻す
          setCurrentTime(currentTime[genre], genre);
        }

        // 音声と映像をゆるく同期
        looseSync(currentTime[genre], genre);
      } else {
        // pause 中は prevPausedRange の end 側を更新し続ける
        prevPausedRange[genre].end = audiocontext.currentTime;
      }
    }
  });

  // 各楽器の ON/OFF
  for (let i = 0, len = spriteTimes[genre].length; i < len; i++) {
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

    AFRAME.registerComponent(`${genre}-cursor-listener${i}`, {
      init: function() {
        this.el.setAttribute('geometry', {
          primitive: 'sphere',
          radius: 1
        });
        this.el.setAttribute('position', positions[genre][i]);
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

          // スイッチの球(半径 1 )の中心から boxVec 方向 1 離れた位置に配置
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
          if (!isPlaying[genre]) {
            return;
          }

          if (audioStates[genre][i]) {
            //this.setAttribute('material', 'color', 'rgb(0, 255, 0)');
            gains[genre][i].gain.value = MAX_VOLUME;
            audioStates[genre][i] = false;
          } else {
            //this.setAttribute('material', 'color', 'gray');
            gains[genre][i].gain.value = 0;
            audioStates[genre][i] = true;
          }
        });
      },
      tick: function() {
        if (!analysers[genre][i]) {
          return;
        }

        // 周波数データを取得(それぞれ 0 ~ 255 の数値)
        const data = new Uint8Array(analysers[genre][i].frequencyBinCount);
        analysers[genre][i].getByteFrequencyData(data);

        // 有効データの下限を更新
        if (frequencyIndexRange.min === null) {
          frequencyIndexRange.min = analysers[genre][i].frequencyBinCount - 1;
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

        for (let j = analysers[genre][i].frequencyBinCount - 1; j > frequencyIndexRange.max; j--) {
          if (data[j] !== 0) {
            frequencyIndexRange.max = j;
            break;
          }
        }

        // 周波数データの両端から常に 0 の範囲を除いたものを有効データとする
        // validRange   : 有効データの下限と上限のインデックスの配列
        // validDataSize: 有効データの要素数
        const validRange = (frequencyIndexRange.max - frequencyIndexRange.min < 0) ?
          { min: 0, max: analysers[genre][i].frequencyBinCount - 1 } : { min: frequencyIndexRange.min, max: frequencyIndexRange.max };

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
          //
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

          const boxHeight = (!isPlaying[genre] || gains[genre][i].gain.value === 0) ? 0.1 : calcHeight(rate);
          const boxColor  = (!isPlaying[genre] || gains[genre][i].gain.value === 0) ? 'gray' : calcColor(rate);

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

  // camear(listener)の位置と向きを定常的に取得して反映
  AFRAME.registerComponent(`${genre}-rotation-reader`, {
    tick: function() {
      const object3d = this.el.object3D;
      object3d.updateMatrixWorld();

      const matrixWorld = object3d.matrixWorld;
      const position = new THREE.Vector3().setFromMatrixPosition(matrixWorld);

      listener.setPosition(position.x, position.y, position.z);

      const mOrientation = matrixWorld.clone();
      mOrientation.setPosition({ x: 0, y: 0, z: 0 });

      const vFront = new THREE.Vector3(0, 0, 1);
      vFront.applyMatrix4(mOrientation);
      vFront.normalize();

      const vUp = new THREE.Vector3(0, -1, 0);
      vUp.applyMatrix4(mOrientation);
      vUp.normalize();

      listener.setOrientation(vFront.x, vFront.y, vFront.z, vUp.x, vUp.y, vUp.z);
    }
  });
});

function load(callback) {
  GENRES.forEach((genre) => {
    // 音声ファイルを読み込む
    const xhr = new XMLHttpRequest();

    xhr.open('GET', audioFiles[genre], true);
    xhr.responseType = 'arraybuffer';
    xhr.send(null);

    xhr.onload = () => {
      audiocontext.decodeAudioData(xhr.response, (buffer) => {
        audioBuffer[genre] = buffer;

        setupHls(genre);

        document.getElementById(`${genre}-sphere-switch`).setAttribute('material', 'color', 'cyan');

        // 各楽器の ON/OFF スイッチの DOM を動的作成する
        const ascnEl = document.getElementById(`${genre}-ascn`);
        const fragment = document.createDocumentFragment();

        for (let i = 0, len = spriteTimes[genre].length; i < len; i++) {
          // 各楽器の ON/OFF スイッチ作成
          const listenerEl = document.createElement('a-entity');

          listenerEl.setAttribute('id', `${genre}-sphere${i}`);
          listenerEl.setAttribute('class', 'clickable');
          listenerEl.setAttribute(`${genre}-cursor-listener${i}`, '');

          fragment.appendChild(listenerEl);
        }

        ascnEl.appendChild(fragment);

        isLoading[genre] = false;

        if (!isLoading.concert && !isLoading.jazz) {
          callback();
        }
      }, () => {
        // TODO: エラーハンドリング
      });
    };

    // TODO: エラーハンドリング
    // xhr.onerror = () => {
    // };
  });
}

// TODO: 理想は, `popstate` イベントハンドラをまとめたいが, フラグやボタンの状態を考慮すると難しい ...
window.addEventListener('popstate', () => {
  GENRES.forEach((genre) => {
    if (!isPlaying[genre]) {
      return;
    }

    pauseVideo(genre);

    for (let i = 0, len = spriteTimes[genre].length; i < len; i++) {
      sources[genre][i].stop(0);
    }

    document.getElementById(`${genre}-sphere-switch`).setAttribute('material', 'color', 'cyan');

    isPlaying[genre] = false;
  });
}, false);

export { audiocontext, load };
