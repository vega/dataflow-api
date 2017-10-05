import {default as df} from './runtime';
import collect from './transforms/collect';
import {relay, sieve} from 'vega-transforms';
import {array} from 'vega-util';

const Output = Symbol('dataflow-output');

export default function(datasource, transforms) {
  return arguments.length < 2
    ? create(null, datasource)
    : create(datasource, transforms);
}

function create(datasource, transforms) {
  let input = null,
      output = null,
      values = null;

  function get() {
    return values.value;
  }

  const object = {
    [Output]: () => output,
    values: get,
    on: f => (df.addDataListener(values, f), object),
    off: f => (df.removeDataListener(values, f), object)
  };

  if (!datasource) {
    object.insert = function(_) {
      df.pulse(input, df.changeset().insert(_)).run();
      return object;
    };

    object.remove = function(_) {
      df.pulse(input, df.changeset().remove(_)).run();
      return object;
    };
  }

  function initialize(tranforms) {
    let source = true,
        pipeline = [collect()],
        i, n, tx, md, gen, mod, pulse, prev;

    // analyze pipeline, inject collectors as needed
    for (i=0, n=tranforms.length; i<n; ++i) {
      tx = tranforms[i];
      md = tx.metadata();

      if (!source && !md.source) {
        source = true;
        pipeline.push(collect());
      }
      pipeline.push(tx);

      if (md.generates) gen = true;
      if (md.modifies && !gen) mod = true;

      if (md.source) source = true;
      else if (md.changes) source = false;
    }
    if (!source) {
      pipeline.push(collect());
    }

    // instantiate operators
    if (datasource) {
      pulse = array(datasource).map(s => s[Output]());
      if (pulse.length === 1) pulse = pulse[0];
      prev = df.add(relay, {derive: mod, pulse: pulse});
    }
    for (i=0, n=pipeline.length; i<n; ++i) {
      pulse = {pulse: prev};
      prev = pipeline[i].create(df, pulse);
      if (i === 0) input = prev;
    }
    output = prev;
    values = df.add(sieve, {pulse: prev});

    df.run();
  }

  initialize(array(transforms));
  return object;
}
