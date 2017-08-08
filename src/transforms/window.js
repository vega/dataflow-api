import {extendParams, removeParams} from './util';
import transform from '../transform';
import {window} from 'vega-transforms';
import {extend} from 'vega-util';

const def = extend({}, window.Definition);

def.params = removeParams(def.params, ['ops', 'fields', 'as', 'param']);
def.params = extendParams(def.params, {
  sort: { alias: 'compare' }
});
def.params.push({name: 'measure', type: 'window', proxy: true});

export default transform(def, ['compare', 'frame', 'measure']);
