import {array, extend, toSet} from 'vega-util';

export function removeParams(params, names) {
  names = toSet(array(names));
  return params.filter(p => !names[p.name]);
}

export function extendParams(params, map) {
  return params.map(p => {
    let name = p.name;
    return map[name] ? extend({}, p, map[name]) : p;
  });
}
