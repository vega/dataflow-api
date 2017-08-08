import {parser} from './parameters';
import * as transforms from 'vega-transforms';
import {array, extend} from 'vega-util';

export default function(def, arg) {
  arg = array(arg);
  let narg = arg.length,
      type = def.type.toLowerCase(),
      params = def.params,
      md = def.metadata;

  return function() {
    let t = instantiate(type, params, md),
        i = 0,
        v;
    for (; i<narg; ++i) {
      v = arguments[i];
      if (v !== undefined) t[arg[i]](v);
    }
    return t;
  };
}

function instantiate(type, params, metadata) {
  const values = {};

  const op = {
    create: (dataflow, pulse) => create(dataflow, pulse, type, params, values),
    metadata: () => metadata
  };

  initialize(op, params, values);

  return op;
}

function create(dataflow, pulse, type, params, values) {
  let q = extend({}, pulse);

  for (let p of params) {
    let name = p.name,
        alias = p.alias || p.name,
        value = values[alias],
        defined = value !== undefined;

    if (p.init && !defined) {
      let subparams = extend({}, pulse);
      for (let subp in p.init.params) {
        subparams[subp] = values[p.init.params[subp]];
      }
      q[name] = dataflow.add(transforms[p.init.type], subparams);
    } else if (defined) {
      if (p.proxy) {
        for (let k in value) q[k] = value[k];
      } else {
        q[name] = value;
      }
    }
  }

  return dataflow.add(transforms[type], q);
}

function initialize(op, params, values) {
  // initialize parameters
  for (let p of params) {
    const alias = p.alias || p.name,
          parse = parser(p);

    // generate getter / setter method
    op[alias] = function(_) {
      if (!arguments.length) return values[alias];
      // TODO: map multiple args to single array?
      values[alias] = parse(_);
      return op;
    };
  }
}
