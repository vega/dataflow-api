import {
  array, compare, error, field,
  isArray, isObject, isFunction, isRegExp, isString,
  toBoolean, toNumber, toSet, toString
} from 'vega-util';

const Ascending = 'ascending',
      Descending = 'descending';
      // AggregateOps = toSet([
      //   'count', 'valid', 'missing', 'distinct',
      //   'sum', 'mean', 'average',
      //   'variance', 'variancep', 'stdev', 'stdevp', 'stderr',
      //   'median', 'q1', 'q3', 'ci0', 'ci1',
      //   'min', 'max', 'argmin', 'argmax'
      // ]);

export function parser(p) {
  const type = p.array ? 'array' : p.type;
  return TypeParsers[type](p);
}

export const TypeParsers = {
  array: p => {
    const len = p.length,
          name = p.name,
          type = TypeParsers[p.type];

    return value => {
      if (!isArray(value)) {
        error(`Expected array parameter: ${name}.`);
      }
      if (len != null && value.length !== len) {
        error(`Expected array of length ${len}: ${name}.`);
      }
      return value.map(type(p));
    };
  },

  compare: p => (value => {
    let cmp = value;
    if (isFunction(cmp)) return cmp;
    if (isString(cmp)) cmp = array(cmp);
    if (isArray(cmp)) cmp = toCompareObject(cmp);
    return isObject(cmp)
      ? compare(cmp.fields, cmp.orders)
      : error(`Unrecognized comparator value for parameter: ${p.name}.`);
  }),

  enum: p => {
    const set = toSet(p.values);
    return value => set[value] ? value
      : error(`Invalid parameter value '${value+''}' for ${p.name}. Must be one of [${p.values}].`);
  },

  expr: p => (value => isFunction(value) ? value
    : error(`Invalid parameter value '${value+''}' for ${p.name}.`)),

  field: p => (value => toField(value) || error(`Invalid parameter value '${value+''}' for ${p.name}.`)),

  measure: () => toMeasure,

  window: () => toWindow,

  boolean: () => toBoolean,

  number: () => toNumber,

  regexp: () => toRegExpString,

  string: () => toString
};

function toRegExpString(value) {
  if (isRegExp(value)) {
    let str = value + '',
        i1 = str.lastIndexOf('/');
    return str.slice(1, i1);
  } else {
    return toString(value);
  }
}

function toCompareObject(array) {
  const fields = [],
        orders = [];

  array.forEach(function(f) {
    if (!f || !isString(f)) error(`Invalid comparator field: '${f+''}'.`);
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

function toField(value) {
  return isFunction(value) ? value
    : isString(value) ? field(value)
    : isObject(value) ? field(value.field, value.name)
    : null;
}

function toMeasure(list) {
  let ops = [], fields = [], as = [];

  for (let measure of list) {
    if (measure.toObject) {
      measure = measure.toObject();
    }

    let op = toString(measure.op);
    // if (!AggregateOps.hasOwnProperty(op)) {
    //   error(`Invalid aggregate operation: ${op}.`);
    // }
    ops.push(op);

    fields.push(toField(measure.field));

    as.push(measure.as ? toString(measure.as) : null);
  }

  return {ops: ops, fields: fields, as: as};
}

function toWindow(list) {
  let ops = [], fields = [], as = [], params = [];

  for (let measure of list) {
    if (measure.toObject) {
      measure = measure.toObject();
    }

    let op = toString(measure.op);
    // if (!AggregateOps.hasOwnProperty(op)) {
    //   error(`Invalid aggregate operation: ${op}.`);
    // }
    ops.push(op);

    params.push(toNumber(measure.param));

    fields.push(toField(measure.field));

    as.push(measure.as ? toString(measure.as) : null);
  }

  return {ops: ops, fields: fields, as: as, params: []};
}
