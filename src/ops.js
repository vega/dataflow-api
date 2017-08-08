function getset(api, obj, name) {
  api[name] = function(_) {
    return arguments.length ? (obj[name] = _, api) : obj[name];
  };
}

function method(op) {
  const obj = {op: op},
        api = {toObject: () => obj};

  getset(api, obj, 'as');
  for (let i=1, n=arguments.length; i<n; ++i) {
    getset(api, obj, arguments[i]);
  }

  return api;
}

function p0(type) { return () => method(type); }
export const count = p0('count');
export const row_number = p0('row_number');
export const rank = p0('rank');
export const dense_rank = p0('dense_rank');
export const percent_rank = p0('percent_rank');
export const cume_dist = p0('cume_dist');

function pf(type) {
  return (field) => method(type, 'field').field(field);
}
export const valid = pf('valid');
export const missing = pf('missing');
export const distinct = pf('distinct');
export const min = pf('min');
export const max = pf('max');
export const argmin = pf('argmin');
export const argmax = pf('argmax');
export const sum = pf('sum');
export const mean = pf('mean');
export const average = pf('average');
export const variance = pf('variance');
export const variancep = pf('variancep');
export const stdev = pf('stdev');
export const stdevp = pf('stdevp');
export const stderr = pf('stderr');
export const median = pf('median');
export const q1 = pf('q1');
export const q3 = pf('q3');
export const ci0 = pf('ci0');
export const ci1 = pf('ci1');
export const first_value = pf('first_value');
export const last_value = pf('last_value');

function pfp(type) {
  return (field, param) => method(type, 'field', 'param').field(field).param(param);
}
export const lag = pfp('lag');
export const lead = pfp('lead');
export const nth_value = pfp('nth_value');

function pp(type) {
  return (param) => method(type, 'param').param(param);
}
export const ntile = pp('ntile');
