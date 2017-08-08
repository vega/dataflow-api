import {removeParams} from './util';
import transform from '../transform';
import {aggregate} from 'vega-transforms';
import {extend} from 'vega-util';

const def = extend({}, aggregate.Definition);

def.params = removeParams(def.params, ['ops', 'fields', 'as']);
def.params.push({name: 'measure', type: 'measure', proxy: true});

export default transform(def, ['groupby', 'measure']);
