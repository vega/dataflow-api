import {removeParams} from './util';
import transform from '../transform';
import {joinaggregate} from 'vega-transforms';
import {extend} from 'vega-util';

const def = extend({}, joinaggregate.Definition);

def.params = removeParams(def.params, ['ops', 'fields', 'as']);
def.params.push({name: 'measure', type: 'measure', proxy: true});

export default transform(def, ['groupby', 'measure']);
