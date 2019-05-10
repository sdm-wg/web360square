# A-Frame Sample

## Setup

### 1. nodebrew のインストール

[nodebrew のインストール](https://weblike-curtaincall.ssl-lolipop.jp/blog/?p=1630) を参考に nodebrew をインストールして, Node.js と npm をインストールしてください.

### 2. リポジトリの clone とパッケージの install

```bash
$ git clone git@github.com:Korilakkuma/aframe-sample.git
$ cd aframe-sample
$ npm install
```

### 3. 動作確認

```bash
$ npm run dev
```

これで, ローカルサーバーが起動するので, http://localhost:8080/ にアクセスしてください

## Development

commit 前に ESLint のチェックとビルドがパスするか ? のチェックは必ずしてください

```bash
$ npm run lint && npm run build
```
