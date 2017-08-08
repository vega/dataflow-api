import {removeParams} from './util';
import transform from '../transform';
import {collect} from 'vega-transforms';
import {extend} from 'vega-util';

const def = extend({}, collect.Definition);

def.params = removeParams(def.params, ['sort']);

export default transform(def);

