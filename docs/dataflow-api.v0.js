(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('vega-dataflow'), require('vega-util'), require('vega-transforms')) :
	typeof define === 'function' && define.amd ? define(['exports', 'vega-dataflow', 'vega-util', 'vega-transforms'], factory) :
	(factory((global.df = global.df || {}),global.vega,global.vega,global.vega.transforms));
}(this, (function (exports,vegaDataflow,vegaUtil,transforms) { 'use strict';

const runtime = new vegaDataflow.Dataflow().logLevel(vegaUtil.Warn);

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

function removeParams(params, names) {
  names = vegaUtil.toSet(vegaUtil.array(names));
  return params.filter(p => !names[p.name]);
}

function extendParams(params, map) {
  return params.map(p => {
    let name = p.name;
    return map[name] ? vegaUtil.extend({}, p, map[name]) : p;
  });
}

const Ascending = 'ascending';
const Descending = 'descending';
const AggregateOps = vegaUtil.toSet(transforms.aggregate.Definition.params[1].values);
const WindowOps = vegaUtil.toSet(transforms.window.Definition.params[2].values);

function parser(p) {
  const type = p.array ? 'array' : p.type;
  return TypeParsers[type](p);
}

const TypeParsers = {
  array: p => {
    const len = p.length,
          name = p.name,
          type = TypeParsers[p.type];

    return value => {
      if (!vegaUtil.isArray(value)) {
        vegaUtil.error(`Expected array parameter: ${name}.`);
      }
      if (len != null && value.length !== len) {
        vegaUtil.error(`Expected array of length ${len}: ${name}.`);
      }
      return value.map(type(p));
    };
  },

  compare: p => (value => {
    let cmp = value;
    if (cmp && vegaUtil.isFunction(cmp.toObject)) {
      cmp = cmp.toObject();
    }
    if (vegaUtil.isString(cmp)) cmp = vegaUtil.array(cmp);
    if (vegaUtil.isArray(cmp)) cmp = toCompareObject(cmp);
    return vegaUtil.isObject(cmp) && !vegaUtil.isFunction(cmp)
      ? vegaUtil.isFunction(cmp.accessor)
        ? vegaUtil.accessor(cmp.accessor, cmp.fields)
        : vegaUtil.compare(cmp.fields, cmp.orders)
      : vegaUtil.error(`Unrecognized comparator value for parameter: ${p.name}.`);
  }),

  enum: p => {
    const set = vegaUtil.toSet(p.values);
    return value => set[value] ? value
      : vegaUtil.error(`Invalid parameter value '${value+''}' for ${p.name}. Must be one of [${p.values}].`);
  },

  expr: p => (value => toExpr(value) || vegaUtil.error(`Invalid parameter value '${value+''}' for ${p.name}.`)),

  field: p => (value => toField(value) || vegaUtil.error(`Invalid parameter value '${value+''}' for ${p.name}.`)),

  measure: () => (list => toMeasure(list, AggregateOps)),

  window: () => (list => toMeasure(list, WindowOps)),

  boolean: () => vegaUtil.toBoolean,

  number: () => vegaUtil.toNumber,

  regexp: () => toRegExpString,

  string: () => vegaUtil.toString
};

function toRegExpString(value) {
  if (vegaUtil.isRegExp(value)) {
    let str = value + '',
        i1 = str.lastIndexOf('/');
    return str.slice(1, i1);
  } else {
    return vegaUtil.toString(value);
  }
}

function toCompareObject(array$$1) {
  const fields = [],
        orders = [];

  array$$1.forEach(function(f) {
    if (!f || !vegaUtil.isString(f)) vegaUtil.error(`Invalid comparator field: '${f+''}'.`);
    let o = Ascending;
    if (f[0] === '-') {
      o = Descending;
      f = f.slice(1);
    } else if (f[0] === '+') {
      f = f.slice(1);
    }
    fields.push(f);
    orders.push(o);
  });

  return {fields: fields, orders: orders};
}

function toExpr(value) {
  if (value && vegaUtil.isFunction(value.toObject)) {
    value = value.toObject();
  }
  // TODO: isString -> parse expression
  return vegaUtil.isObject(value) && !vegaUtil.isFunction(value)
    ? vegaUtil.accessor(value.accessor, value.fields, value.as)
    : null;
}

function toField(value) {
  if (value && vegaUtil.isFunction(value.toObject)) {
    value = value.toObject();
  }
  return vegaUtil.isString(value) ? vegaUtil.field(value)
    : vegaUtil.isObject(value) && !vegaUtil.isFunction(value)
    ? vegaUtil.isFunction(value.accessor)
      ? vegaUtil.accessor(value.accessor, value.fields, value.as)
      : vegaUtil.field(value.field, value.as)
    : null;
}

function toMeasure(list, validOps) {
  let ops = [], fields = [], as = [], params = [];

  for (let measure of list) {
    if (vegaUtil.isFunction(measure.toObject)) {
      measure = measure.toObject();
    }

    let op = vegaUtil.toString(measure.op);
    if (!validOps.hasOwnProperty(op)) {
      vegaUtil.error(`Invalid operation: ${op}.`);
    }
    ops.push(op);

    params.push(vegaUtil.toNumber(measure.param));

    fields.push(toField(measure.field));

    as.push(measure.as ? vegaUtil.toString(measure.as) : null);
  }

  return params.every(v => v == null)
    ? {ops: ops, fields: fields, as: as}
    : {ops: ops, fields: fields, as: as, params: params};
}

var transform = function(def, arg) {
  arg = vegaUtil.array(arg);
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
};

function instantiate(type, params, metadata) {
  const values = {};

  const op = {
    create: (dataflow, pulse) => create$1(dataflow, pulse, type, params, values),
    metadata: () => metadata
  };

  initialize(op, params, values);

  return op;
}

function create$1(dataflow, pulse, type, params, values) {
  let q = vegaUtil.extend({}, pulse);

  for (let p of params) {
    let name = p.name,
        alias = p.alias || p.name,
        value = values[alias],
        defined = value !== undefined;

    if (p.init && !defined) {
      let subparams = vegaUtil.extend({}, pulse);
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

const def = vegaUtil.extend({}, transforms.collect.Definition);

def.params = removeParams(def.params, ['sort']);

var collect$1 = transform(def);

const Output = Symbol('dataflow-output');

var dataflow = function(datasource, transforms$$1) {
  return arguments.length < 2
    ? create(null, datasource)
    : create(datasource, transforms$$1);
};

function create(datasource, transforms$$1) {
  let input = null,
      output = null,
      values = null;

  function get() {
    return values.value;
  }

  const object = {
    [Output]: () => output,
    values: get,
    on: f => (runtime.addDataListener(values, f), object),
    off: f => (runtime.removeDataListener(values, f), object)
  };

  if (!datasource) {
    object.insert = function(_) {
      runtime.pulse(input, runtime.changeset().insert(_)).run();
      return object;
    };

    object.remove = function(_) {
      runtime.pulse(input, runtime.changeset().remove(_)).run();
      return object;
    };
  }

  function initialize(tranforms) {
    let source = true,
        pipeline = [collect$1()],
        i, n, tx, md, gen, mod, pulse, prev;

    // analyze pipeline, inject collectors as needed
    for (i=0, n=tranforms.length; i<n; ++i) {
      tx = tranforms[i];
      md = tx.metadata();

      if (!source && !md.source) {
        source = true;
        pipeline.push(collect$1());
      }
      pipeline.push(tx);

      if (md.generates) gen = true;
      if (md.modifies && !gen) mod = true;

      if (md.source) source = true;
      else if (md.changes) source = false;
    }
    if (!source) {
      pipeline.push(collect$1());
    }

    // instantiate operators
    if (datasource) {
      pulse = vegaUtil.array(datasource).map(s => s[Output]());
      if (pulse.length === 1) pulse = pulse[0];
      prev = runtime.add(transforms.relay, {derive: mod, pulse: pulse});
    }
    for (i=0, n=pipeline.length; i<n; ++i) {
      pulse = {pulse: prev};
      prev = pipeline[i].create(runtime, pulse);
      if (i === 0) input = prev;
    }
    output = prev;
    values = runtime.add(transforms.sieve, {pulse: prev});

    runtime.run();
  }

  initialize(vegaUtil.array(transforms$$1));
  return object;
}

const def$1 = vegaUtil.extend({}, transforms.aggregate.Definition);

def$1.params = removeParams(def$1.params, ['ops', 'fields', 'as']);
def$1.params.push({name: 'measure', type: 'measure', proxy: true});

var aggregate$1 = transform(def$1, ['groupby', 'measure']);

const def$2 = vegaUtil.extend({}, transforms.bin.Definition);

def$2.params = extendParams(def$2.params, {
  extent: {
    init: { type: 'extent', params: {field: 'field'} }
  }
});

var bin$1 = transform(def$2, 'field');

const def$3 = vegaUtil.extend({}, transforms.countpattern.Definition);

def$3.params = extendParams(def$3.params, {
  pattern: { type: 'regexp' },
  stopwords: { type: 'regexp' }
});

var countpattern$1 = transform(def$3, ['field', 'pattern', 'case']);

var filter$1 = transform(transforms.filter.Definition, 'expr');

var fold$1 = transform(transforms.fold.Definition, 'fields');

var formula$1 = transform(transforms.formula.Definition, ['as', 'expr']);

const def$4 = vegaUtil.extend({}, transforms.joinaggregate.Definition);

def$4.params = removeParams(def$4.params, ['ops', 'fields', 'as']);
def$4.params.push({name: 'measure', type: 'measure', proxy: true});

var joinaggregate$1 = transform(def$4, ['groupby', 'measure']);

const def$5 = vegaUtil.extend({}, transforms.project.Definition);

def$5.params = removeParams(def$5.params, ['as']);

var project$1 = transform(def$5, ['fields']);

var sample$1 = transform(transforms.sample.Definition, 'size');

const def$6 = vegaUtil.extend({}, transforms.collect.Definition);

def$6.params = extendParams(def$6.params, {
  sort: { alias: 'compare' }
});

var sort = transform(def$6, 'compare');

const def$7 = vegaUtil.extend({}, transforms.window.Definition);

def$7.params = removeParams(def$7.params, ['ops', 'fields', 'as', 'params']);
def$7.params = extendParams(def$7.params, {
  sort: { alias: 'compare' }
});
def$7.params.push({name: 'measure', type: 'window', proxy: true});

var window$1 = transform(def$7, ['compare', 'frame', 'measure']);

function apiObject(base) {
  const obj = base || {},
        api = {toObject: () => obj};

  getset(api, obj, 'as');
  for (let i=1, n=arguments.length; i<n; ++i) {
    getset(api, obj, arguments[i]);
  }

  return api;
}

function getset(api, obj, name) {
  api[name] = function(_) {
    return arguments.length ? (obj[name] = _, api) : obj[name];
  };
}

const field$1 = (f => apiObject({field: f}));

const expr = (f => apiObject({accessor: f}, 'fields'));

function op0(type) { return () => apiObject({op: type}); }
const count = op0('count');
const row_number = op0('row_number');
const rank = op0('rank');
const dense_rank = op0('dense_rank');
const percent_rank = op0('percent_rank');
const cume_dist = op0('cume_dist');

function opField(type) {
  return (field$$1) => apiObject({op: type}, 'field').field(field$$1);
}
const valid = opField('valid');
const missing = opField('missing');
const distinct = opField('distinct');
const min = opField('min');
const max = opField('max');
const argmin = opField('argmin');
const argmax = opField('argmax');
const sum = opField('sum');
const mean = opField('mean');
const average = opField('average');
const variance = opField('variance');
const variancep = opField('variancep');
const stdev = opField('stdev');
const stdevp = opField('stdevp');
const stderr = opField('stderr');
const median = opField('median');
const q1 = opField('q1');
const q3 = opField('q3');
const ci0 = opField('ci0');
const ci1 = opField('ci1');
const first_value = opField('first_value');
const last_value = opField('last_value');

function opFieldParam(type) {
  return (field$$1, param) => apiObject({op: type}, 'field', 'param').field(field$$1).param(param);
}
const lag = opFieldParam('lag');
const lead = opFieldParam('lead');
const nth_value = opFieldParam('nth_value');

function opParam(type) {
  return (param) => apiObject({op: type}, 'param').param(param);
}
const ntile = opParam('ntile');

exports.dataflow = dataflow;
exports.aggregate = aggregate$1;
exports.bin = bin$1;
exports.countpattern = countpattern$1;
exports.filter = filter$1;
exports.fold = fold$1;
exports.formula = formula$1;
exports.joinaggregate = joinaggregate$1;
exports.project = project$1;
exports.sample = sample$1;
exports.sort = sort;
exports.window = window$1;
exports.field = field$1;
exports.expr = expr;
exports.count = count;
exports.row_number = row_number;
exports.rank = rank;
exports.dense_rank = dense_rank;
exports.percent_rank = percent_rank;
exports.cume_dist = cume_dist;
exports.valid = valid;
exports.missing = missing;
exports.distinct = distinct;
exports.min = min;
exports.max = max;
exports.argmin = argmin;
exports.argmax = argmax;
exports.sum = sum;
exports.mean = mean;
exports.average = average;
exports.variance = variance;
exports.variancep = variancep;
exports.stdev = stdev;
exports.stdevp = stdevp;
exports.stderr = stderr;
exports.median = median;
exports.q1 = q1;
exports.q3 = q3;
exports.ci0 = ci0;
exports.ci1 = ci1;
exports.first_value = first_value;
exports.last_value = last_value;
exports.lag = lag;
exports.lead = lead;
exports.nth_value = nth_value;
exports.ntile = ntile;

Object.defineProperty(exports, '__esModule', { value: true });

})));
