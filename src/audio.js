import AFRAME from 'aframe';
import { BufferLoader } from './BufferLoader';
import { setupHls, playVideo } from './video';

const AudioContext = window.AudioContext || window.webkitAudioContext;

const audiocontext = new AudioContext();
const mastergain   = audiocontext.createGain();
const compressor   = audiocontext.createDynamicsCompressor();
const listener     = audiocontext.listener;

const MAX_VOLUME = 0.5;
const AUDIO_FILES = [
  './assets/audio/KeyMix.mp3',
  './assets/audio/BassMix.mp3',
  './assets/audio/DrmsMix.mp3',
];

// 音関連の変数
const sources = [];
const gains   = [];
const panners = [];

// ファイルのON/OFF管理変数は全部offにしておく
const audioStates = [false, false, false];

let isPlaying = false;
let isLoading = true;

// 音楽を再生するためのスイッチ(色: cyan)を押したときの処理
AFRAME.registerComponent('cursor-listener-switch', {
  init: function() {
    // 'touchstart' では, iOS でイベントが発生しない
    this.el.addEventListener('mousedown', function() {
      if (isLoading || isPlaying) {
        return;
      }

      // HACK: videoが遅れるので0.4秒から再生してみる
      video.currentTime = 0.4;

      playVideo();

      for (let i = 0, len = AUDIO_FILES.length; i < len; i++) {
        sources[i].start(0);
      }

      this.setAttribute('material', 'color', 'gray');
      isPlaying = true;
    });
  }
});

// 楽器の Keyboard の ON/OFF
AFRAME.registerComponent('cursor-listener0', {
  init: function() {
    // 'touchstart' では, iOS でイベントが発生しない
    this.el.addEventListener('mousedown', function() {
      if (!isPlaying) {
        return;
      }

      if (audioStates[0]) {
        this.setAttribute('material', 'color', 'green');
        gains[0].gain.value = MAX_VOLUME;
        audioStates[0] = false;
      } else {
        this.setAttribute('material', 'color', 'gray');
        gains[0].gain.value = 0;
        audioStates[0] = true;
      }
    });
  }
});

// Bass の ON/OFF
AFRAME.registerComponent('cursor-listener1', {
  init: function() {
    // 'touchstart' では, iOS でイベントが発生しない
    this.el.addEventListener('mousedown', function() {
      if (!isPlaying) {
        return;
      }

      if (audioStates[1]) {
        this.setAttribute('material', 'color', 'red');
        gains[1].gain.value = MAX_VOLUME;
        audioStates[1] = false;
      } else {
        this.setAttribute('material', 'color', 'gray');
        gains[1].gain.value = 0;
        audioStates[1] = true;
      }
    });
  }
});

// Drum の ON/OFF
AFRAME.registerComponent('cursor-listener2', {
  init: function() {
    // 'touchstart' では, iOS でイベントが発生しない
    this.el.addEventListener('mousedown', function() {
      if (!isPlaying) {
        return;
      }

      if (audioStates[2]) {
        this.setAttribute('material', 'color', 'blue');
        gains[2].gain.value = MAX_VOLUME;
        audioStates[2] = false;
      } else {
        this.setAttribute('material', 'color', 'gray');
        gains[2].gain.value = 0;
        audioStates[2] = true;
      }
    });
  }
});

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
  const bufferLoader = new BufferLoader(audiocontext, AUDIO_FILES, (bufferList) => {
    for (let i = 0, len = AUDIO_FILES.length; i < len; i++) {
      sources[i] = audiocontext.createBufferSource();
      sources[i].buffer = bufferList[i];

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

      sources[i].connect(gains[i]);
      gains[i].connect(panners[i]);
      panners[i].connect(mastergain);
      mastergain.connect(compressor);
      compressor.connect(audiocontext.destination);

      sources[i].loop = true;
    }

    setupHls();

    document.getElementById('sphere-switch').setAttribute('material', 'color', 'cyan');

    isLoading = false;
  });

  bufferLoader.load();
}

export { audiocontext, load };
