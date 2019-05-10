export class BufferLoader {
  constructor(context, urlList, callback) {
    this.context    = context;
    this.urlList    = urlList;
    this.onload     = callback;
    this.bufferList = [];
    this.loadCount  = 0;
  }

  loadBuffer(url, index) {
    // Load buffer asynchronously
    const xhr = new XMLHttpRequest();

    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = () => {
      // Asynchronously decode the audio file data in xhr.response
      this.context.decodeAudioData(xhr.response, (buffer) => {
        if (!buffer) {
          alert('error decoding file data: ' + url);
          return;
        }

        this.bufferList[index] = buffer;

        if (++this.loadCount === this.urlList.length) {
          this.onload(this.bufferList);
        }
      },
      (error) => {
        alert(error);
      });
    };

    xhr.onerror = () => {
      alert('BufferLoader: XHR error');
    };

    xhr.send(null);
  }

  load() {
    for (let i = 0, len = this.urlList.length; i < len; i++) {
      this.loadBuffer(this.urlList[i], i);
    }
  }
}
