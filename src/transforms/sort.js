import {extendParams} from './util';
import transform from '../transform';
import {collect} from 'vega-transforms';
import {extend} from 'vega-util';

const def = extend({}, collect.Definition);

def.params = extendParams(def.params, {
  sort: { alias: 'compare' }
});

export default transform(def, 'compare');
