export const GENRES = ['concert', 'pops'];

// 配列をシャッフルする(boxVecs用)
export const arrayShuffle = (arr) => {
  let len = arr.length;

  while (len > 0) {
    const rnd = Math.floor(Math.random() * len);
    const tmp = arr[len - 1];
    arr[len - 1] = arr[rnd];
    arr[rnd] = tmp;
    len--;
  }
};

export const calcHeight = (rate) => {
  // 高さ 0 を返すと勝手に高さ1(?)ぐらいの box を表示されるので
  // rate が 0.1 未満のときは 0.1 を返す
  return (rate < 0.1) ? 0.1 : rate * 3;
};

// 時間信号 / 周波数信号の強さに依存して変更
// [rate:小] blue < green < yellow < orange < red [rate:大]
export const calcColor = (rate) => {
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
