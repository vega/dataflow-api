import transform from '../transform';
import {formula} from 'vega-transforms';

export default transform(formula.Definition, ['as', 'expr']);
