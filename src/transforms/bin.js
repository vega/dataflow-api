import {extendParams} from './util';
import transform from '../transform';
import {bin} from 'vega-transforms';
import {extend} from 'vega-util';

const def = extend({}, bin.Definition);

def.params = extendParams(def.params, {
  extent: {
    init: { type: 'extent', params: {field: 'field'} }
  }
});

export default transform(def, 'field');
