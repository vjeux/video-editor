
var CALLS = {
  processFrame: ({frameID}) => {
    self.postMessage('42');
  }
}

self.onmessage = ({ data: {call, ...args} }) => {
  CALLS[call](args);
};
