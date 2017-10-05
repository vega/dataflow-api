import {aggregate, window} from 'vega-transforms';
import {
  accessor, array, compare, error, field,
  isArray, isObject, isFunction, isRegExp, isString,
  toBoolean, toNumber, toSet, toString
} from 'vega-util';

const Ascending = 'ascending',
      Descending = 'descending',
      AggregateOps = toSet(aggregate.Definition.params[1].values),
      WindowOps = toSet(window.Definition.params[2].values);

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
    if (cmp && isFunction(cmp.toObject)) {
      cmp = cmp.toObject();
    }
    if (isString(cmp)) cmp = array(cmp);
    if (isArray(cmp)) cmp = toCompareObject(cmp);
    return isObject(cmp) && !isFunction(cmp)
      ? isFunction(cmp.accessor)
        ? accessor(cmp.accessor, cmp.fields)
        : compare(cmp.fields, cmp.orders)
      : error(`Unrecognized comparator value for parameter: ${p.name}.`);
  }),

  enum: p => {
    const set = toSet(p.values);
    return value => set[value] ? value
      : error(`Invalid parameter value '${value+''}' for ${p.name}. Must be one of [${p.values}].`);
  },

  expr: p => (value => toExpr(value) || error(`Invalid parameter value '${value+''}' for ${p.name}.`)),

  field: p => (value => toField(value) || error(`Invalid parameter value '${value+''}' for ${p.name}.`)),

  measure: () => (list => toMeasure(list, AggregateOps)),

  window: () => (list => toMeasure(list, WindowOps)),

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

function toExpr(value) {
  if (value && isFunction(value.toObject)) {
    value = value.toObject();
  }
  // TODO: isString -> parse expression
  return isObject(value) && !isFunction(value)
    ? accessor(value.accessor, value.fields, value.as)
    : null;
}

function toField(value) {
  if (value && isFunction(value.toObject)) {
    value = value.toObject();
  }
  return isString(value) ? field(value)
    : isObject(value) && !isFunction(value)
    ? isFunction(value.accessor)
      ? accessor(value.accessor, value.fields, value.as)
      : field(value.field, value.as)
    : null;
}

function toMeasure(list, validOps) {
  let ops = [], fields = [], as = [], params = [];

  for (let measure of list) {
    if (isFunction(measure.toObject)) {
      measure = measure.toObject();
    }

    let op = toString(measure.op);
    if (!validOps.hasOwnProperty(op)) {
      error(`Invalid operation: ${op}.`);
    }
    ops.push(op);

    params.push(toNumber(measure.param));

    fields.push(toField(measure.field));

    as.push(measure.as ? toString(measure.as) : null);
  }

  return params.every(v => v == null)
    ? {ops: ops, fields: fields, as: as}
    : {ops: ops, fields: fields, as: as, params: params};
}
