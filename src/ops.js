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

export const field = (f => apiObject({field: f}));

export const expr = (f => apiObject({accessor: f}, 'fields'));

function op0(type) { return () => apiObject({op: type}); }
export const count = op0('count');
export const row_number = op0('row_number');
export const rank = op0('rank');
export const dense_rank = op0('dense_rank');
export const percent_rank = op0('percent_rank');
export const cume_dist = op0('cume_dist');

function opField(type) {
  return (field) => apiObject({op: type}, 'field').field(field);
}
export const valid = opField('valid');
export const missing = opField('missing');
export const distinct = opField('distinct');
export const min = opField('min');
export const max = opField('max');
export const argmin = opField('argmin');
export const argmax = opField('argmax');
export const sum = opField('sum');
export const mean = opField('mean');
export const average = opField('average');
export const variance = opField('variance');
export const variancep = opField('variancep');
export const stdev = opField('stdev');
export const stdevp = opField('stdevp');
export const stderr = opField('stderr');
export const median = opField('median');
export const q1 = opField('q1');
export const q3 = opField('q3');
export const ci0 = opField('ci0');
export const ci1 = opField('ci1');
export const first_value = opField('first_value');
export const last_value = opField('last_value');

function opFieldParam(type) {
  return (field, param) => apiObject({op: type}, 'field', 'param').field(field).param(param);
}
export const lag = opFieldParam('lag');
export const lead = opFieldParam('lead');
export const nth_value = opFieldParam('nth_value');

function opParam(type) {
  return (param) => apiObject({op: type}, 'param').param(param);
}
export const ntile = opParam('ntile');
