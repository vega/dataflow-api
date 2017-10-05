import {removeParams} from './util';
import transform from '../transform';
import {project} from 'vega-transforms';
import {extend} from 'vega-util';

const def = extend({}, project.Definition);

def.params = removeParams(def.params, ['as']);

export default transform(def, ['fields']);
