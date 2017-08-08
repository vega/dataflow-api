import transform from '../transform';
import {filter} from 'vega-transforms';

export default transform(filter.Definition, 'expr');
