import {extendParams} from './util';
import transform from '../transform';
import {countpattern} from 'vega-transforms';
import {extend} from 'vega-util';

const def = extend({}, countpattern.Definition);

def.params = extendParams(def.params, {
  pattern: { type: 'regexp' },
  stopwords: { type: 'regexp' }
});

export default transform(def, ['field', 'pattern', 'case']);
