import {Dataflow} from 'vega-dataflow';
import {Warn} from 'vega-util';

const runtime = new Dataflow().logLevel(Warn);

let listeners = [];

runtime.addDataListener = function(op, callback) {
  listeners.push({op: op, fn: callback});
};

runtime.removeDataListener = function(op, callback) {
  let v = null;
  for (let l of listeners) {
    if (l.op === op && l.fn === callback) {
      v = l; break;
    }
  }
  if (v) {
    listeners = listeners.filter(l => l !== v);
  }
};

runtime._onrun = function() {
  let s = runtime.stamp(),
      a = listeners.filter(l => l.op.stamp === s);
  if (a.length) {
    setTimeout(function() {
      a.forEach(l => l.fn(l.op.value));
    }, 0);
  }
};

export default runtime;
