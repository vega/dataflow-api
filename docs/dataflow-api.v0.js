(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('vega-loader')) :
	typeof define === 'function' && define.amd ? define(['exports', 'vega-loader'], factory) :
	(factory((global.df = {}),global.vega));
}(this, (function (exports,vegaLoader) { 'use strict';

var accessor = function(fn, fields, name) {
  fn.fields = fields || [];
  fn.fname = name;
  return fn;
};

function accessorName(fn) {
  return fn == null ? null : fn.fname;
}

function accessorFields(fn) {
  return fn == null ? null : fn.fields;
}

var error = function(message) {
  throw Error(message);
};

var splitAccessPath = function(p) {
  var path = [],
      q = null,
      b = 0,
      n = p.length,
      s = '',
      i, j, c;

  p = p + '';

  function push() {
    path.push(s + p.substring(i, j));
    s = '';
    i = j + 1;
  }

  for (i=j=0; j<n; ++j) {
    c = p[j];
    if (c === '\\') {
      s += p.substring(i, j);
      i = ++j;
    } else if (c === q) {
      push();
      q = null;
      b = -1;
    } else if (q) {
      continue;
    } else if (i === b && c === '"') {
      i = j + 1;
      q = c;
    } else if (i === b && c === "'") {
      i = j + 1;
      q = c;
    } else if (c === '.' && !b) {
      if (j > i) {
        push();
      } else {
        i = j + 1;
      }
    } else if (c === '[') {
      if (j > i) push();
      b = i = j + 1;
    } else if (c === ']') {
      if (!b) error('Access path missing open bracket: ' + p);
      if (b > 0) push();
      b = 0;
      i = j + 1;
    }
  }

  if (b) error('Access path missing closing bracket: ' + p);
  if (q) error('Access path missing closing quote: ' + p);

  if (j > i) {
    j++;
    push();
  }

  return path;
};

var isArray = Array.isArray;

var isObject = function(_) {
  return _ === Object(_);
};

var isString = function(_) {
  return typeof _ === 'string';
};

function $(x) {
  return isArray(x) ? '[' + x.map($) + ']'
    : isObject(x) || isString(x) ?
      // Output valid JSON and JS source strings.
      // See http://timelessrepo.com/json-isnt-a-javascript-subset
      JSON.stringify(x).replace('\u2028','\\u2028').replace('\u2029', '\\u2029')
    : x;
}

var field = function(field, name) {
  var path = splitAccessPath(field),
      code = 'return _[' + path.map($).join('][') + '];';

  return accessor(
    Function('_', code),
    [(field = path.length===1 ? path[0] : field)],
    name || field
  );
};

var empty = [];

var id = field('id');

var identity = accessor(function(_) { return _; }, empty, 'identity');

var zero = accessor(function() { return 0; }, empty, 'zero');

var one = accessor(function() { return 1; }, empty, 'one');

var truthy = accessor(function() { return true; }, empty, 'true');

var falsy = accessor(function() { return false; }, empty, 'false');

function log(method, level, input) {
  var args = [level].concat([].slice.call(input));
  console[method].apply(console, args); // eslint-disable-line no-console
}

var None  = 0;
var Error$1 = 1;
var Warn  = 2;
var Info  = 3;
var Debug = 4;

var logger = function(_) {
  var level = _ || None;
  return {
    level: function(_) {
      if (arguments.length) {
        level = +_;
        return this;
      } else {
        return level;
      }
    },
    error: function() {
      if (level >= Error$1) log('error', 'ERROR', arguments);
      return this;
    },
    warn: function() {
      if (level >= Warn) log('warn', 'WARN', arguments);
      return this;
    },
    info: function() {
      if (level >= Info) log('log', 'INFO', arguments);
      return this;
    },
    debug: function() {
      if (level >= Debug) log('log', 'DEBUG', arguments);
      return this;
    }
  }
};

var toNumber = function(_) {
  return _ == null || _ === '' ? null : +_;
};

var array = function(_) {
  return _ != null ? (isArray(_) ? _ : [_]) : [];
};

var isFunction = function(_) {
  return typeof _ === 'function';
};

var compare = function(fields, orders) {
  var idx = [],
      cmp = (fields = array(fields)).map(function(f, i) {
        if (f == null) {
          return null;
        } else {
          idx.push(i);
          return isFunction(f) ? f
            : splitAccessPath(f).map($).join('][');
        }
      }),
      n = idx.length - 1,
      ord = array(orders),
      code = 'var u,v;return ',
      i, j, f, u, v, d, t, lt, gt;

  if (n < 0) return null;

  for (j=0; j<=n; ++j) {
    i = idx[j];
    f = cmp[i];

    if (isFunction(f)) {
      d = 'f' + i;
      u = '(u=this.' + d + '(a))';
      v = '(v=this.' + d + '(b))';
      (t = t || {})[d] = f;
    } else {
      u = '(u=a['+f+'])';
      v = '(v=b['+f+'])';
    }

    d = '((v=v instanceof Date?+v:v),(u=u instanceof Date?+u:u))';

    if (ord[i] !== 'descending') {
      gt = 1;
      lt = -1;
    } else {
      gt = -1;
      lt = 1;
    }

    code += '(' + u+'<'+v+'||u==null)&&v!=null?' + lt
      + ':(u>v||v==null)&&u!=null?' + gt
      + ':'+d+'!==u&&v===v?' + lt
      + ':v!==v&&u===u?' + gt
      + (i < n ? ':' : ':0');
  }

  f = Function('a', 'b', code + ';');
  if (t) f = f.bind(t);

  fields = fields.reduce(function(map, field) {
    if (isFunction(field)) {
      (accessorFields(field) || []).forEach(function(_) { map[_] = 1; });
    } else if (field != null) {
      map[field + ''] = 1;
    }
    return map;
  }, {});

  return accessor(f, Object.keys(fields));
};

var constant = function(_) {
  return isFunction(_) ? _ : function() { return _; };
};

var debounce = function(delay, handler) {
  var tid, evt;

  function callback() {
    handler(evt);
    tid = evt = null;
  }

  return function(e) {
    evt = e;
    if (tid) clearTimeout(tid);
    tid = setTimeout(callback, delay);
  };
};

var extend = function(_) {
  for (var x, k, i=1, len=arguments.length; i<len; ++i) {
    x = arguments[i];
    for (k in x) { _[k] = x[k]; }
  }
  return _;
};

var extentIndex = function(array, f) {
  var i = -1,
      n = array.length,
      a, b, c, u, v;

  if (f == null) {
    while (++i < n) {
      b = array[i];
      if (b != null && b >= b) {
        a = c = b;
        break;
      }
    }
    u = v = i;
    while (++i < n) {
      b = array[i];
      if (b != null) {
        if (a > b) {
          a = b;
          u = i;
        }
        if (c < b) {
          c = b;
          v = i;
        }
      }
    }
  } else {
    while (++i < n) {
      b = f(array[i], i, array);
      if (b != null && b >= b) {
        a = c = b;
        break;
      }
    }
    u = v = i;
    while (++i < n) {
      b = f(array[i], i, array);
      if (b != null) {
        if (a > b) {
          a = b;
          u = i;
        }
        if (c < b) {
          c = b;
          v = i;
        }
      }
    }
  }

  return [u, v];
};

var NULL = {};

var fastmap = function(input) {
  var obj = {},
      map,
      test;

  function has(key) {
    return obj.hasOwnProperty(key) && obj[key] !== NULL;
  }

  map = {
    size: 0,
    empty: 0,
    object: obj,
    has: has,
    get: function(key) {
      return has(key) ? obj[key] : undefined;
    },
    set: function(key, value) {
      if (!has(key)) {
        ++map.size;
        if (obj[key] === NULL) --map.empty;
      }
      obj[key] = value;
      return this;
    },
    delete: function(key) {
      if (has(key)) {
        --map.size;
        ++map.empty;
        obj[key] = NULL;
      }
      return this;
    },
    clear: function() {
      map.size = map.empty = 0;
      map.object = obj = {};
    },
    test: function(_) {
      if (arguments.length) {
        test = _;
        return map;
      } else {
        return test;
      }
    },
    clean: function() {
      var next = {},
          size = 0,
          key, value;
      for (key in obj) {
        value = obj[key];
        if (value !== NULL && (!test || !test(value))) {
          next[key] = value;
          ++size;
        }
      }
      map.size = size;
      map.empty = 0;
      map.object = (obj = next);
    }
  };

  if (input) Object.keys(input).forEach(function(key) {
    map.set(key, input[key]);
  });

  return map;
};

var inherits = function(child, parent) {
  var proto = (child.prototype = Object.create(parent.prototype));
  proto.constructor = child;
  return proto;
};

var isRegExp = function(_) {
  return Object.prototype.toString.call(_) === '[object RegExp]';
};

var key = function(fields) {
  fields = fields ? array(fields) : fields;
  var fn = !(fields && fields.length)
    ? function() { return ''; }
    : Function('_', 'return \'\'+' +
        fields.map(function(f) {
          return '_[' + splitAccessPath(f).map($).join('][') + ']';
        }).join('+\'|\'+') + ';');
  return accessor(fn, fields, 'key');
};

var merge = function(compare, array0, array1, output) {
  var n0 = array0.length,
      n1 = array1.length;

  if (!n1) return array0;
  if (!n0) return array1;

  var merged = output || new array0.constructor(n0 + n1),
      i0 = 0, i1 = 0, i = 0;

  for (; i0<n0 && i1<n1; ++i) {
    merged[i] = compare(array0[i0], array1[i1]) > 0
       ? array1[i1++]
       : array0[i0++];
  }

  for (; i0<n0; ++i0, ++i) {
    merged[i] = array0[i0];
  }

  for (; i1<n1; ++i1, ++i) {
    merged[i] = array1[i1];
  }

  return merged;
};

var toBoolean = function(_) {
  return _ == null || _ === '' ? null : !_ || _ === 'false' || _ === '0' ? false : !!_;
};

var toString = function(_) {
  return _ == null || _ === '' ? null : _ + '';
};

var toSet = function(_) {
  for (var s={}, i=0, n=_.length; i<n; ++i) s[_[i]] = 1;
  return s;
};

var visitArray = function(array, filter, visitor) {
  if (array) {
    var i = 0, n = array.length, t;
    if (filter) {
      for (; i<n; ++i) {
        if (t = filter(array[i])) visitor(t, i, array);
      }
    } else {
      array.forEach(visitor);
    }
  }
};

function UniqueList(idFunc) {
  var $ = idFunc || identity,
      list = [],
      ids = {};

  list.add = function(_) {
    var id = $(_);
    if (!ids[id]) {
      ids[id] = 1;
      list.push(_);
    }
    return list;
  };

  list.remove = function(_) {
    var id = $(_), idx;
    if (ids[id]) {
      ids[id] = 0;
      if ((idx = list.indexOf(_)) >= 0) {
        list.splice(idx, 1);
      }
    }
    return list;
  };

  return list;
}

var TUPLE_ID_KEY = Symbol('vega_id');
var TUPLE_ID = 1;

/**
 * Resets the internal tuple id counter to one.
 */


/**
 * Checks if an input value is a registered tuple.
 * @param {*} t - The value to check.
 * @return {boolean} True if the input is a tuple, false otherwise.
 */


/**
 * Returns the id of a tuple.
 * @param {object} t - The input tuple.
 * @return {*} the tuple id.
 */
function tupleid(t) {
  return t[TUPLE_ID_KEY];
}

/**
 * Sets the id of a tuple.
 * @param {object} t - The input tuple.
 * @param {*} id - The id value to set.
 * @return {object} the input tuple.
 */
function setid(t, id) {
  t[TUPLE_ID_KEY] = id;
  return t;
}

/**
 * Ingest an object or value as a data tuple.
 * If the input value is an object, an id field will be added to it. For
 * efficiency, the input object is modified directly. A copy is not made.
 * If the input value is a literal, it will be wrapped in a new object
 * instance, with the value accessible as the 'data' property.
 * @param datum - The value to ingest.
 * @return {object} The ingested data tuple.
 */
function ingest(datum) {
  var t = (datum === Object(datum)) ? datum : {data: datum};
  return tupleid(t) ? t : setid(t, TUPLE_ID++);
}

/**
 * Given a source tuple, return a derived copy.
 * @param {object} t - The source tuple.
 * @return {object} The derived tuple.
 */
function derive(t) {
  return rederive(t, ingest({}));
}

/**
 * Rederive a derived tuple by copying values from the source tuple.
 * @param {object} t - The source tuple.
 * @param {object} d - The derived tuple.
 * @return {object} The derived tuple.
 */
function rederive(t, d) {
  for (var k in t) d[k] = t[k];
  return d;
}

/**
 * Replace an existing tuple with a new tuple.
 * @param {object} t - The existing data tuple.
 * @param {object} d - The new tuple that replaces the old.
 * @return {object} The new tuple.
 */
function replace(t, d) {
  return setid(d, tupleid(t));
}

function isChangeSet(v) {
  return v && v.constructor === changeset;
}

function changeset() {
  var add = [],  // insert tuples
      rem = [],  // remove tuples
      mod = [],  // modify tuples
      remp = [], // remove by predicate
      modp = [], // modify by predicate
      reflow = false;

  return {
    constructor: changeset,
    insert: function(t) {
      var d = array(t), i = 0, n = d.length;
      for (; i<n; ++i) add.push(d[i]);
      return this;
    },
    remove: function(t) {
      var a = isFunction(t) ? remp : rem,
          d = array(t), i = 0, n = d.length;
      for (; i<n; ++i) a.push(d[i]);
      return this;
    },
    modify: function(t, field, value) {
      var m = {field: field, value: constant(value)};
      if (isFunction(t)) {
        m.filter = t;
        modp.push(m);
      } else {
        m.tuple = t;
        mod.push(m);
      }
      return this;
    },
    encode: function(t, set) {
      if (isFunction(t)) modp.push({filter: t, field: set});
      else mod.push({tuple: t, field: set});
      return this;
    },
    reflow: function() {
      reflow = true;
      return this;
    },
    pulse: function(pulse, tuples) {
      var out, i, n, m, f, t, id;

      // add
      for (i=0, n=add.length; i<n; ++i) {
        pulse.add.push(ingest(add[i]));
      }

      // remove
      for (out={}, i=0, n=rem.length; i<n; ++i) {
        t = rem[i];
        out[tupleid(t)] = t;
      }
      for (i=0, n=remp.length; i<n; ++i) {
        f = remp[i];
        tuples.forEach(function(t) {
          if (f(t)) out[tupleid(t)] = t;
        });
      }
      for (id in out) pulse.rem.push(out[id]);

      // modify
      function modify(t, f, v) {
        if (v) t[f] = v(t); else pulse.encode = f;
        if (!reflow) out[tupleid(t)] = t;
      }
      for (out={}, i=0, n=mod.length; i<n; ++i) {
        m = mod[i];
        modify(m.tuple, m.field, m.value);
        pulse.modifies(m.field);
      }
      for (i=0, n=modp.length; i<n; ++i) {
        m = modp[i];
        f = m.filter;
        tuples.forEach(function(t) {
          if (f(t)) modify(t, m.field, m.value);
        });
        pulse.modifies(m.field);
      }

      // reflow?
      if (reflow) {
        pulse.mod = rem.length || remp.length
          ? tuples.filter(function(t) { return out.hasOwnProperty(tupleid(t)); })
          : tuples.slice();
      } else {
        for (id in out) pulse.mod.push(out[id]);
      }

      return pulse;
    }
  };
}

var CACHE = '_:mod:_';

/**
 * Hash that tracks modifications to assigned values.
 * Callers *must* use the set method to update values.
 */
function Parameters() {
  Object.defineProperty(this, CACHE, {writable:true, value: {}});
}

var prototype$2 = Parameters.prototype;

/**
 * Set a parameter value. If the parameter value changes, the parameter
 * will be recorded as modified.
 * @param {string} name - The parameter name.
 * @param {number} index - The index into an array-value parameter. Ignored if
 *   the argument is undefined, null or less than zero.
 * @param {*} value - The parameter value to set.
 * @param {boolean} [force=false] - If true, records the parameter as modified
 *   even if the value is unchanged.
 * @return {Parameters} - This parameter object.
 */
prototype$2.set = function(name, index, value, force) {
  var o = this,
      v = o[name],
      mod = o[CACHE];

  if (index != null && index >= 0) {
    if (v[index] !== value || force) {
      v[index] = value;
      mod[index + ':' + name] = -1;
      mod[name] = -1;
    }
  } else if (v !== value || force) {
    o[name] = value;
    mod[name] = isArray(value) ? 1 + value.length : -1;
  }

  return o;
};

/**
 * Tests if one or more parameters has been modified. If invoked with no
 * arguments, returns true if any parameter value has changed. If the first
 * argument is array, returns trues if any parameter name in the array has
 * changed. Otherwise, tests if the given name and optional array index has
 * changed.
 * @param {string} name - The parameter name to test.
 * @param {number} [index=undefined] - The parameter array index to test.
 * @return {boolean} - Returns true if a queried parameter was modified.
 */
prototype$2.modified = function(name, index) {
  var mod = this[CACHE], k;
  if (!arguments.length) {
    for (k in mod) { if (mod[k]) return true; }
    return false;
  } else if (isArray(name)) {
    for (k=0; k<name.length; ++k) {
      if (mod[name[k]]) return true;
    }
    return false;
  }
  return (index != null && index >= 0)
    ? (index + 1 < mod[name] || !!mod[index + ':' + name])
    : !!mod[name];
};

/**
 * Clears the modification records. After calling this method,
 * all parameters are considered unmodified.
 */
prototype$2.clear = function() {
  this[CACHE] = {};
  return this;
};

var OP_ID = 0;
var PULSE = 'pulse';
var NO_PARAMS = new Parameters();

// Boolean Flags
var SKIP     = 1;
var MODIFIED = 2;

/**
 * An Operator is a processing node in a dataflow graph.
 * Each operator stores a value and an optional value update function.
 * Operators can accept a hash of named parameters. Parameter values can
 * either be direct (JavaScript literals, arrays, objects) or indirect
 * (other operators whose values will be pulled dynamically). Operators
 * included as parameters will have this operator added as a dependency.
 * @constructor
 * @param {*} [init] - The initial value for this operator.
 * @param {function(object, Pulse)} [update] - An update function. Upon
 *   evaluation of this operator, the update function will be invoked and the
 *   return value will be used as the new value of this operator.
 * @param {object} [params] - The parameters for this operator.
 * @param {boolean} [react=true] - Flag indicating if this operator should
 *   listen for changes to upstream operators included as parameters.
 * @see parameters
 */
function Operator(init, update, params, react) {
  this.id = ++OP_ID;
  this.value = init;
  this.stamp = -1;
  this.rank = -1;
  this.qrank = -1;
  this.flags = 0;

  if (update) {
    this._update = update;
  }
  if (params) this.parameters(params, react);
}

var prototype$1 = Operator.prototype;

/**
 * Returns a list of target operators dependent on this operator.
 * If this list does not exist, it is created and then returned.
 * @return {UniqueList}
 */
prototype$1.targets = function() {
  return this._targets || (this._targets = UniqueList(id));
};

/**
 * Sets the value of this operator.
 * @param {*} value - the value to set.
 * @return {Number} Returns 1 if the operator value has changed
 *   according to strict equality, returns 0 otherwise.
 */
prototype$1.set = function(value) {
  if (this.value !== value) {
    this.value = value;
    return 1;
  } else {
    return 0;
  }
};

function flag(bit) {
  return function(state) {
    var f = this.flags;
    if (arguments.length === 0) return !!(f & bit);
    this.flags = state ? (f | bit) : (f & ~bit);
    return this;
  };
}

/**
 * Indicates that operator evaluation should be skipped on the next pulse.
 * This operator will still propagate incoming pulses, but its update function
 * will not be invoked. The skip flag is reset after every pulse, so calling
 * this method will affect processing of the next pulse only.
 */
prototype$1.skip = flag(SKIP);

/**
 * Indicates that this operator's value has been modified on its most recent
 * pulse. Normally modification is checked via strict equality; however, in
 * some cases it is more efficient to update the internal state of an object.
 * In those cases, the modified flag can be used to trigger propagation. Once
 * set, the modification flag persists across pulses until unset. The flag can
 * be used with the last timestamp to test if a modification is recent.
 */
prototype$1.modified = flag(MODIFIED);

/**
 * Sets the parameters for this operator. The parameter values are analyzed for
 * operator instances. If found, this operator will be added as a dependency
 * of the parameterizing operator. Operator values are dynamically marshalled
 * from each operator parameter prior to evaluation. If a parameter value is
 * an array, the array will also be searched for Operator instances. However,
 * the search does not recurse into sub-arrays or object properties.
 * @param {object} params - A hash of operator parameters.
 * @param {boolean} [react=true] - A flag indicating if this operator should
 *   automatically update (react) when parameter values change. In other words,
 *   this flag determines if the operator registers itself as a listener on
 *   any upstream operators included in the parameters.
 * @return {Operator[]} - An array of upstream dependencies.
 */
prototype$1.parameters = function(params, react) {
  react = react !== false;
  var self = this,
      argval = (self._argval = self._argval || new Parameters()),
      argops = (self._argops = self._argops || []),
      deps = [],
      name, value, n, i;

  function add(name, index, value) {
    if (value instanceof Operator) {
      if (value !== self) {
        if (react) value.targets().add(self);
        deps.push(value);
      }
      argops.push({op:value, name:name, index:index});
    } else {
      argval.set(name, index, value);
    }
  }

  for (name in params) {
    value = params[name];

    if (name === PULSE) {
      array(value).forEach(function(op) {
        if (!(op instanceof Operator)) {
          error('Pulse parameters must be operator instances.');
        } else if (op !== self) {
          op.targets().add(self);
          deps.push(op);
        }
      });
      self.source = value;
    } else if (isArray(value)) {
      argval.set(name, -1, Array(n = value.length));
      for (i=0; i<n; ++i) add(name, i, value[i]);
    } else {
      add(name, -1, value);
    }
  }

  this.marshall().clear(); // initialize values
  return deps;
};

/**
 * Internal method for marshalling parameter values.
 * Visits each operator dependency to pull the latest value.
 * @return {Parameters} A Parameters object to pass to the update function.
 */
prototype$1.marshall = function(stamp) {
  var argval = this._argval || NO_PARAMS,
      argops = this._argops, item, i, n, op, mod;

  if (argops && (n = argops.length)) {
    for (i=0; i<n; ++i) {
      item = argops[i];
      op = item.op;
      mod = op.modified() && op.stamp === stamp;
      argval.set(item.name, item.index, op.value, mod);
    }
  }
  return argval;
};

/**
 * Delegate method to perform operator processing.
 * Subclasses can override this method to perform custom processing.
 * By default, it marshalls parameters and calls the update function
 * if that function is defined. If the update function does not
 * change the operator value then StopPropagation is returned.
 * If no update function is defined, this method does nothing.
 * @param {Pulse} pulse - the current dataflow pulse.
 * @return The output pulse or StopPropagation. A falsy return value
 *   (including undefined) will let the input pulse pass through.
 */
prototype$1.evaluate = function(pulse) {
  if (this._update) {
    var params = this.marshall(pulse.stamp),
        v = this._update(params, pulse);

    params.clear();
    if (v !== this.value) {
      this.value = v;
    } else if (!this.modified()) {
      return pulse.StopPropagation;
    }
  }
};

/**
 * Run this operator for the current pulse. If this operator has already
 * been run at (or after) the pulse timestamp, returns StopPropagation.
 * Internally, this method calls {@link evaluate} to perform processing.
 * If {@link evaluate} returns a falsy value, the input pulse is returned.
 * This method should NOT be overridden, instead overrride {@link evaluate}.
 * @param {Pulse} pulse - the current dataflow pulse.
 * @return the output pulse for this operator (or StopPropagation)
 */
prototype$1.run = function(pulse) {
  if (pulse.stamp <= this.stamp) return pulse.StopPropagation;
  var rv;
  if (this.skip()) {
    this.skip(false);
    rv = 0;
  } else {
    rv = this.evaluate(pulse);
  }
  this.stamp = pulse.stamp;
  this.pulse = rv;
  return rv || pulse;
};

/**
 * Add an operator to the dataflow graph. This function accepts a
 * variety of input argument types. The basic signature supports an
 * initial value, update function and parameters. If the first parameter
 * is an Operator instance, it will be added directly. If it is a
 * constructor for an Operator subclass, a new instance will be instantiated.
 * Otherwise, if the first parameter is a function instance, it will be used
 * as the update function and a null initial value is assumed.
 * @param {*} init - One of: the operator to add, the initial value of
 *   the operator, an operator class to instantiate, or an update function.
 * @param {function} [update] - The operator update function.
 * @param {object} [params] - The operator parameters.
 * @param {boolean} [react=true] - Flag indicating if this operator should
 *   listen for changes to upstream operators included as parameters.
 * @return {Operator} - The added operator.
 */
var add = function(init, update, params, react) {
  var shift = 1,
    op;

  if (init instanceof Operator) {
    op = init;
  } else if (init && init.prototype instanceof Operator) {
    op = new init();
  } else if (isFunction(init)) {
    op = new Operator(null, init);
  } else {
    shift = 0;
    op = new Operator(init, update);
  }

  this.rank(op);
  if (shift) {
    react = params;
    params = update;
  }
  if (params) this.connect(op, op.parameters(params, react));
  this.touch(op);

  return op;
};

/**
 * Connect a target operator as a dependent of source operators.
 * If necessary, this method will rerank the target operator and its
 * dependents to ensure propagation proceeds in a topologically sorted order.
 * @param {Operator} target - The target operator.
 * @param {Array<Operator>} - The source operators that should propagate
 *   to the target operator.
 */
var connect = function(target, sources) {
  var targetRank = target.rank, i, n;

  for (i=0, n=sources.length; i<n; ++i) {
    if (targetRank < sources[i].rank) {
      this.rerank(target);
      return;
    }
  }
};

var STREAM_ID = 0;

/**
 * Models an event stream.
 * @constructor
 * @param {function(Object, number): boolean} [filter] - Filter predicate.
 *   Events pass through when truthy, events are suppressed when falsy.
 * @param {function(Object): *} [apply] - Applied to input events to produce
 *   new event values.
 * @param {function(Object)} [receive] - Event callback function to invoke
 *   upon receipt of a new event. Use to override standard event processing.
 */
function EventStream(filter, apply, receive) {
  this.id = ++STREAM_ID;
  this.value = null;
  if (receive) this.receive = receive;
  if (filter) this._filter = filter;
  if (apply) this._apply = apply;
}

/**
 * Creates a new event stream instance with the provided
 * (optional) filter, apply and receive functions.
 * @param {function(Object, number): boolean} [filter] - Filter predicate.
 *   Events pass through when truthy, events are suppressed when falsy.
 * @param {function(Object): *} [apply] - Applied to input events to produce
 *   new event values.
 * @see EventStream
 */
function stream(filter, apply, receive) {
  return new EventStream(filter, apply, receive);
}

var prototype$3 = EventStream.prototype;

prototype$3._filter = truthy;

prototype$3._apply = identity;

prototype$3.targets = function() {
  return this._targets || (this._targets = UniqueList(id));
};

prototype$3.consume = function(_) {
  if (!arguments.length) return !!this._consume;
  this._consume = !!_;
  return this;
};

prototype$3.receive = function(evt) {
  if (this._filter(evt)) {
    var val = (this.value = this._apply(evt)),
        trg = this._targets,
        n = trg ? trg.length : 0,
        i = 0;

    for (; i<n; ++i) trg[i].receive(val);

    if (this._consume) {
      evt.preventDefault();
      evt.stopPropagation();
    }
  }
};

prototype$3.filter = function(filter) {
  var s = stream(filter);
  this.targets().add(s);
  return s;
};

prototype$3.apply = function(apply) {
  var s = stream(null, apply);
  this.targets().add(s);
  return s;
};

prototype$3.merge = function() {
  var s = stream();

  this.targets().add(s);
  for (var i=0, n=arguments.length; i<n; ++i) {
    arguments[i].targets().add(s);
  }

  return s;
};

prototype$3.throttle = function(pause) {
  var t = -1;
  return this.filter(function() {
    var now = Date.now();
    if ((now - t) > pause) {
      t = now;
      return 1;
    } else {
      return 0;
    }
  });
};

prototype$3.debounce = function(delay) {
  var s = stream();

  this.targets().add(stream(null, null,
    debounce(delay, function(e) {
      var df = e.dataflow;
      s.receive(e);
      if (df && df.run) df.run();
    })
  ));

  return s;
};

prototype$3.between = function(a, b) {
  var active = false;
  a.targets().add(stream(null, null, function() { active = true; }));
  b.targets().add(stream(null, null, function() { active = false; }));
  return this.filter(function() { return active; });
};

/**
 * Create a new event stream from an event source.
 * @param {object} source - The event source to monitor. The input must
 *  support the addEventListener method.
 * @param {string} type - The event type.
 * @param {function(object): boolean} [filter] - Event filter function.
 * @param {function(object): *} [apply] - Event application function.
 *   If provided, this function will be invoked and the result will be
 *   used as the downstream event value.
 * @return {EventStream}
 */
var events = function(source, type, filter, apply) {
  var df = this,
      s = stream(filter, apply),
      send = function(e) {
        e.dataflow = df;
        try {
          s.receive(e);
        } catch (error) {
          df.error(error);
        } finally {
          df.run();
        }
      },
      sources;

  if (typeof source === 'string' && typeof document !== 'undefined') {
    sources = document.querySelectorAll(source);
  } else {
    sources = array(source);
  }

  for (var i=0, n=sources.length; i<n; ++i) {
    sources[i].addEventListener(type, send);
  }

  return s;
};

function ingest$1(target, data, format) {
  return this.pulse(target, this.changeset().insert(vegaLoader.read(data, format)));
}

function loadPending(df) {
  var accept, reject,
      pending = new Promise(function(a, r) {
        accept = a;
        reject = r;
      });

  pending.requests = 0;

  pending.done = function() {
    if (--pending.requests === 0) {
      df.runAfter(function() {
        df._pending = null;
        try {
          df.run();
          accept(df);
        } catch (err) {
          reject(err);
        }
      });
    }
  };

  return (df._pending = pending);
}

function request(target, url, format) {
  var df = this,
      pending = df._pending || loadPending(df);

  pending.requests += 1;

  df.loader()
    .load(url, {context:'dataflow'})
    .then(
      function(data) { df.ingest(target, data, format); },
      function(error) { df.error('Loading failed', url, error); })
    .catch(
      function(error) { df.error('Data ingestion failed', url, error); })
    .then(pending.done, pending.done);
}

var SKIP$1 = {skip: true};

/**
 * Perform operator updates in response to events. Applies an
 * update function to compute a new operator value. If the update function
 * returns a {@link ChangeSet}, the operator will be pulsed with those tuple
 * changes. Otherwise, the operator value will be updated to the return value.
 * @param {EventStream|Operator} source - The event source to react to.
 *   This argument can be either an EventStream or an Operator.
 * @param {Operator|function(object):Operator} target - The operator to update.
 *   This argument can either be an Operator instance or (if the source
 *   argument is an EventStream), a function that accepts an event object as
 *   input and returns an Operator to target.
 * @param {function(Parameters,Event): *} [update] - Optional update function
 *   to compute the new operator value, or a literal value to set. Update
 *   functions expect to receive a parameter object and event as arguments.
 *   This function can either return a new operator value or (if the source
 *   argument is an EventStream) a {@link ChangeSet} instance to pulse
 *   the target operator with tuple changes.
 * @param {object} [params] - The update function parameters.
 * @param {object} [options] - Additional options hash. If not overridden,
 *   updated operators will be skipped by default.
 * @param {boolean} [options.skip] - If true, the operator will
 *  be skipped: it will not be evaluated, but its dependents will be.
 * @param {boolean} [options.force] - If true, the operator will
 *   be re-evaluated even if its value has not changed.
 * @return {Dataflow}
 */
var on = function(source, target, update, params, options) {
  var fn = source instanceof Operator ? onOperator : onStream;
  fn(this, source, target, update, params, options);
  return this;
};

function onStream(df, stream, target, update, params, options) {
  var opt = extend({}, options, SKIP$1), func, op;

  if (!isFunction(target)) target = constant(target);

  if (update === undefined) {
    func = function(e) {
      df.touch(target(e));
    };
  } else if (isFunction(update)) {
    op = new Operator(null, update, params, false);
    func = function(e) {
      var v, t = target(e);
      op.evaluate(e);
      isChangeSet(v = op.value) ? df.pulse(t, v, options) : df.update(t, v, opt);
    };
  } else {
    func = function(e) {
      df.update(target(e), update, opt);
    };
  }

  stream.apply(func);
}

function onOperator(df, source, target, update, params, options) {
  var func, op;

  if (update === undefined) {
    op = target;
  } else {
    func = isFunction(update) ? update : constant(update);
    update = !target ? func : function(_, pulse) {
      var value = func(_, pulse);
      return target.skip()
        ? value
        : (target.skip(true).value = value);
    };

    op = new Operator(null, update, params, false);
    op.modified(options && options.force);
    op.rank = 0;

    if (target) {
      op.skip(true); // skip first invocation
      op.value = target.value;
      op.targets().add(target);
    }
  }

  source.targets().add(op);
}

/**
 * Assigns a rank to an operator. Ranks are assigned in increasing order
 * by incrementing an internal rank counter.
 * @param {Operator} op - The operator to assign a rank.
 */
function rank(op) {
  op.rank = ++this._rank;
}

/**
 * Re-ranks an operator and all downstream target dependencies. This
 * is necessary when upstream depencies of higher rank are added to
 * a target operator.
 * @param {Operator} op - The operator to re-rank.
 */
function rerank(op) {
  var queue = [op],
      cur, list, i;

  while (queue.length) {
    this.rank(cur = queue.pop());
    if (list = cur._targets) {
      for (i=list.length; --i >= 0;) {
        queue.push(cur = list[i]);
        if (cur === op) error('Cycle detected in dataflow graph.');
      }
    }
  }
}

/**
 * Sentinel value indicating pulse propagation should stop.
 */
var StopPropagation = {};

// Pulse visit type flags
var ADD       = (1 << 0);
var REM       = (1 << 1);
var MOD       = (1 << 2);
var ADD_REM   = ADD | REM;
var ADD_MOD   = ADD | MOD;
var ALL       = ADD | REM | MOD;
var REFLOW    = (1 << 3);
var SOURCE    = (1 << 4);
var NO_SOURCE = (1 << 5);
var NO_FIELDS = (1 << 6);

/**
 * A Pulse enables inter-operator communication during a run of the
 * dataflow graph. In addition to the current timestamp, a pulse may also
 * contain a change-set of added, removed or modified data tuples, as well as
 * a pointer to a full backing data source. Tuple change sets may not
 * be fully materialized; for example, to prevent needless array creation
 * a change set may include larger arrays and corresponding filter functions.
 * The pulse provides a {@link visit} method to enable proper and efficient
 * iteration over requested data tuples.
 *
 * In addition, each pulse can track modification flags for data tuple fields.
 * Responsible transform operators should call the {@link modifies} method to
 * indicate changes to data fields. The {@link modified} method enables
 * querying of this modification state.
 *
 * @constructor
 * @param {Dataflow} dataflow - The backing dataflow instance.
 * @param {number} stamp - The current propagation timestamp.
 * @param {string} [encode] - An optional encoding set name, which is then
 *   accessible as Pulse.encode. Operators can respond to (or ignore) this
 *   setting as appropriate. This parameter can be used in conjunction with
 *   the Encode transform in the vega-encode module.
 */
function Pulse(dataflow, stamp, encode) {
  this.dataflow = dataflow;
  this.stamp = stamp == null ? -1 : stamp;
  this.add = [];
  this.rem = [];
  this.mod = [];
  this.fields = null;
  this.encode = encode || null;
}

var prototype$4 = Pulse.prototype;

/**
 * Sentinel value indicating pulse propagation should stop.
 */
prototype$4.StopPropagation = StopPropagation;

/**
 * Boolean flag indicating ADD (added) tuples.
 */
prototype$4.ADD = ADD;

/**
 * Boolean flag indicating REM (removed) tuples.
 */
prototype$4.REM = REM;

/**
 * Boolean flag indicating MOD (modified) tuples.
 */
prototype$4.MOD = MOD;

/**
 * Boolean flag indicating ADD (added) and REM (removed) tuples.
 */
prototype$4.ADD_REM = ADD_REM;

/**
 * Boolean flag indicating ADD (added) and MOD (modified) tuples.
 */
prototype$4.ADD_MOD = ADD_MOD;

/**
 * Boolean flag indicating ADD, REM and MOD tuples.
 */
prototype$4.ALL = ALL;

/**
 * Boolean flag indicating all tuples in a data source
 * except for the ADD, REM and MOD tuples.
 */
prototype$4.REFLOW = REFLOW;

/**
 * Boolean flag indicating a 'pass-through' to a
 * backing data source, ignoring ADD, REM and MOD tuples.
 */
prototype$4.SOURCE = SOURCE;

/**
 * Boolean flag indicating that source data should be
 * suppressed when creating a forked pulse.
 */
prototype$4.NO_SOURCE = NO_SOURCE;

/**
 * Boolean flag indicating that field modifications should be
 * suppressed when creating a forked pulse.
 */
prototype$4.NO_FIELDS = NO_FIELDS;

/**
 * Creates a new pulse based on the values of this pulse.
 * The dataflow, time stamp and field modification values are copied over.
 * By default, new empty ADD, REM and MOD arrays are created.
 * @param {number} flags - Integer of boolean flags indicating which (if any)
 *   tuple arrays should be copied to the new pulse. The supported flag values
 *   are ADD, REM and MOD. Array references are copied directly: new array
 *   instances are not created.
 * @return {Pulse} - The forked pulse instance.
 * @see init
 */
prototype$4.fork = function(flags) {
  return new Pulse(this.dataflow).init(this, flags);
};

/**
 * Returns a pulse that adds all tuples from a backing source. This is
 * useful for cases where operators are added to a dataflow after an
 * upstream data pipeline has already been processed, ensuring that
 * new operators can observe all tuples within a stream.
 * @return {Pulse} - A pulse instance with all source tuples included
 *   in the add array. If the current pulse already has all source
 *   tuples in its add array, it is returned directly. If the current
 *   pulse does not have a backing source, it is returned directly.
 */
prototype$4.addAll = function() {
  var p = this;
  if (!this.source || this.source.length === this.add.length) {
    return p;
  } else {
    p = new Pulse(this.dataflow).init(this);
    p.add = p.source;
    return p;
  }
};

/**
 * Initialize this pulse based on the values of another pulse. This method
 * is used internally by {@link fork} to initialize a new forked tuple.
 * The dataflow, time stamp and field modification values are copied over.
 * By default, new empty ADD, REM and MOD arrays are created.
 * @param {Pulse} src - The source pulse to copy from.
 * @param {number} flags - Integer of boolean flags indicating which (if any)
 *   tuple arrays should be copied to the new pulse. The supported flag values
 *   are ADD, REM and MOD. Array references are copied directly: new array
 *   instances are not created. By default, source data arrays are copied
 *   to the new pulse. Use the NO_SOURCE flag to enforce a null source.
 * @return {Pulse} - Returns this Pulse instance.
 */
prototype$4.init = function(src, flags) {
  var p = this;
  p.stamp = src.stamp;
  p.encode = src.encode;

  if (src.fields && !(flags & NO_FIELDS)) {
    p.fields = src.fields;
  }

  if (flags & ADD) {
    p.addF = src.addF;
    p.add = src.add;
  } else {
    p.addF = null;
    p.add = [];
  }

  if (flags & REM) {
    p.remF = src.remF;
    p.rem = src.rem;
  } else {
    p.remF = null;
    p.rem = [];
  }

  if (flags & MOD) {
    p.modF = src.modF;
    p.mod = src.mod;
  } else {
    p.modF = null;
    p.mod = [];
  }

  if (flags & NO_SOURCE) {
    p.srcF = null;
    p.source = null;
  } else {
    p.srcF = src.srcF;
    p.source = src.source;
  }

  return p;
};

/**
 * Schedules a function to run after pulse propagation completes.
 * @param {function} func - The function to run.
 */
prototype$4.runAfter = function(func) {
  this.dataflow.runAfter(func);
};

/**
 * Indicates if tuples have been added, removed or modified.
 * @param {number} [flags] - The tuple types (ADD, REM or MOD) to query.
 *   Defaults to ALL, returning true if any tuple type has changed.
 * @return {boolean} - Returns true if one or more queried tuple types have
 *   changed, false otherwise.
 */
prototype$4.changed = function(flags) {
  var f = flags || ALL;
  return ((f & ADD) && this.add.length)
      || ((f & REM) && this.rem.length)
      || ((f & MOD) && this.mod.length);
};

/**
 * Forces a "reflow" of tuple values, such that all tuples in the backing
 * source are added to the MOD set, unless already present in the ADD set.
 * @param {boolean} [fork=false] - If true, returns a forked copy of this
 *   pulse, and invokes reflow on that derived pulse.
 * @return {Pulse} - The reflowed pulse instance.
 */
prototype$4.reflow = function(fork) {
  if (fork) return this.fork(ALL).reflow();

  var len = this.add.length,
      src = this.source && this.source.length;
  if (src && src !== len) {
    this.mod = this.source;
    if (len) this.filter(MOD, filter(this, ADD));
  }
  return this;
};

/**
 * Marks one or more data field names as modified to assist dependency
 * tracking and incremental processing by transform operators.
 * @param {string|Array<string>} _ - The field(s) to mark as modified.
 * @return {Pulse} - This pulse instance.
 */
prototype$4.modifies = function(_) {
  var fields = array(_),
      hash = this.fields || (this.fields = {});
  fields.forEach(function(f) { hash[f] = true; });
  return this;
};

/**
 * Checks if one or more data fields have been modified during this pulse
 * propagation timestamp.
 * @param {string|Array<string>} _ - The field(s) to check for modified.
 * @return {boolean} - Returns true if any of the provided fields has been
 *   marked as modified, false otherwise.
 */
prototype$4.modified = function(_) {
  var fields = this.fields;
  return !(this.mod.length && fields) ? false
    : !arguments.length ? !!fields
    : isArray(_) ? _.some(function(f) { return fields[f]; })
    : fields[_];
};

/**
 * Adds a filter function to one more tuple sets. Filters are applied to
 * backing tuple arrays, to determine the actual set of tuples considered
 * added, removed or modified. They can be used to delay materialization of
 * a tuple set in order to avoid expensive array copies. In addition, the
 * filter functions can serve as value transformers: unlike standard predicate
 * function (which return boolean values), Pulse filters should return the
 * actual tuple value to process. If a tuple set is already filtered, the
 * new filter function will be appended into a conjuntive ('and') query.
 * @param {number} flags - Flags indicating the tuple set(s) to filter.
 * @param {function(*):object} filter - Filter function that will be applied
 *   to the tuple set array, and should return a data tuple if the value
 *   should be included in the tuple set, and falsy (or null) otherwise.
 * @return {Pulse} - Returns this pulse instance.
 */
prototype$4.filter = function(flags, filter) {
  var p = this;
  if (flags & ADD) p.addF = addFilter(p.addF, filter);
  if (flags & REM) p.remF = addFilter(p.remF, filter);
  if (flags & MOD) p.modF = addFilter(p.modF, filter);
  if (flags & SOURCE) p.srcF = addFilter(p.srcF, filter);
  return p;
};

function addFilter(a, b) {
  return a ? function(t,i) { return a(t,i) && b(t,i); } : b;
}

/**
 * Materialize one or more tuple sets in this pulse. If the tuple set(s) have
 * a registered filter function, it will be applied and the tuple set(s) will
 * be replaced with materialized tuple arrays.
 * @param {number} flags - Flags indicating the tuple set(s) to materialize.
 * @return {Pulse} - Returns this pulse instance.
 */
prototype$4.materialize = function(flags) {
  flags = flags || ALL;
  var p = this;
  if ((flags & ADD) && p.addF) {
    p.add = materialize(p.add, p.addF);
    p.addF = null;
  }
  if ((flags & REM) && p.remF) {
    p.rem = materialize(p.rem, p.remF);
    p.remF = null;
  }
  if ((flags & MOD) && p.modF) {
    p.mod = materialize(p.mod, p.modF);
    p.modF = null;
  }
  if ((flags & SOURCE) && p.srcF) {
    p.source = p.source.filter(p.srcF);
    p.srcF = null;
  }
  return p;
};

function materialize(data, filter) {
  var out = [];
  visitArray(data, filter, function(_) { out.push(_); });
  return out;
}

function filter(pulse, flags) {
  var map = {};
  pulse.visit(flags, function(t) { map[tupleid(t)] = 1; });
  return function(t) { return map[tupleid(t)] ? null : t; };
}

/**
 * Visit one or more tuple sets in this pulse.
 * @param {number} flags - Flags indicating the tuple set(s) to visit.
 *   Legal values are ADD, REM, MOD and SOURCE (if a backing data source
 *   has been set).
 * @param {function(object):*} - Visitor function invoked per-tuple.
 * @return {Pulse} - Returns this pulse instance.
 */
prototype$4.visit = function(flags, visitor) {
  var p = this, v = visitor, src, sum;

  if (flags & SOURCE) {
    visitArray(p.source, p.srcF, v);
    return p;
  }

  if (flags & ADD) visitArray(p.add, p.addF, v);
  if (flags & REM) visitArray(p.rem, p.remF, v);
  if (flags & MOD) visitArray(p.mod, p.modF, v);

  if ((flags & REFLOW) && (src = p.source)) {
    sum = p.add.length + p.mod.length;
    if (sum === src.length) {
      // do nothing
    } else if (sum) {
      visitArray(src, filter(p, ADD_MOD), v);
    } else {
      // if no add/rem/mod tuples, visit source
      visitArray(src, p.srcF, v);
    }
  }

  return p;
};

/**
 * Represents a set of multiple pulses. Used as input for operators
 * that accept multiple pulses at a time. Contained pulses are
 * accessible via the public "pulses" array property. This pulse doe
 * not carry added, removed or modified tuples directly. However,
 * the visit method can be used to traverse all such tuples contained
 * in sub-pulses with a timestamp matching this parent multi-pulse.
 * @constructor
 * @param {Dataflow} dataflow - The backing dataflow instance.
 * @param {number} stamp - The timestamp.
 * @param {Array<Pulse>} pulses - The sub-pulses for this multi-pulse.
 */
function MultiPulse(dataflow, stamp, pulses, encode) {
  var p = this,
      c = 0,
      pulse, hash, i, n, f;

  this.dataflow = dataflow;
  this.stamp = stamp;
  this.fields = null;
  this.encode = encode || null;
  this.pulses = pulses;

  for (i=0, n=pulses.length; i<n; ++i) {
    pulse = pulses[i];
    if (pulse.stamp !== stamp) continue;

    if (pulse.fields) {
      hash = p.fields || (p.fields = {});
      for (f in pulse.fields) { hash[f] = 1; }
    }

    if (pulse.changed(p.ADD)) c |= p.ADD;
    if (pulse.changed(p.REM)) c |= p.REM;
    if (pulse.changed(p.MOD)) c |= p.MOD;
  }

  this.changes = c;
}

var prototype$5 = inherits(MultiPulse, Pulse);

/**
 * Creates a new pulse based on the values of this pulse.
 * The dataflow, time stamp and field modification values are copied over.
 * @return {Pulse}
 */
prototype$5.fork = function(flags) {
  var p = new Pulse(this.dataflow).init(this, flags & this.NO_FIELDS);
  if (flags !== undefined) {
    if (flags & p.ADD) {
      this.visit(p.ADD, function(t) { return p.add.push(t); });
    }
    if (flags & p.REM) {
      this.visit(p.REM, function(t) { return p.rem.push(t); });
    }
    if (flags & p.MOD) {
      this.visit(p.MOD, function(t) { return p.mod.push(t); });
    }
  }
  return p;
};

prototype$5.changed = function(flags) {
  return this.changes & flags;
};

prototype$5.modified = function(_) {
  var p = this, fields = p.fields;
  return !(fields && (p.changes & p.MOD)) ? 0
    : isArray(_) ? _.some(function(f) { return fields[f]; })
    : fields[_];
};

prototype$5.filter = function() {
  error('MultiPulse does not support filtering.');
};

prototype$5.materialize = function() {
  error('MultiPulse does not support materialization.');
};

prototype$5.visit = function(flags, visitor) {
  var p = this,
      pulses = p.pulses,
      n = pulses.length,
      i = 0;

  if (flags & p.SOURCE) {
    for (; i<n; ++i) {
      pulses[i].visit(flags, visitor);
    }
  } else {
    for (; i<n; ++i) {
      if (pulses[i].stamp === p.stamp) {
        pulses[i].visit(flags, visitor);
      }
    }
  }

  return p;
};

/**
 * Runs the dataflow. This method will increment the current timestamp
 * and process all updated, pulsed and touched operators. When run for
 * the first time, all registered operators will be processed. If there
 * are pending data loading operations, this method will return immediately
 * without evaluating the dataflow. Instead, the dataflow will be
 * asynchronously invoked when data loading completes. To track when dataflow
 * evaluation completes, use the {@link runAsync} method instead.
 * @param {string} [encode] - The name of an encoding set to invoke during
 *   propagation. This value is added to generated Pulse instances;
 *   operators can then respond to (or ignore) this setting as appropriate.
 *   This parameter can be used in conjunction with the Encode transform in
 *   the vega-encode module.
 */
function run(encode) {
  var df = this,
      count = 0,
      level = df.logLevel(),
      op, next, dt, error;

  if (df._pending) {
    df.info('Awaiting requests, delaying dataflow run.');
    return 0;
  }

  if (df._pulse) {
    df.error('Dataflow invoked recursively. Use the runAfter method to queue invocation.');
    return 0;
  }

  if (!df._touched.length) {
    df.info('Dataflow invoked, but nothing to do.');
    return 0;
  }

  df._pulse = new Pulse(df, ++df._clock, encode);

  if (level >= Info) {
    dt = Date.now();
    df.debug('-- START PROPAGATION (' + df._clock + ') -----');
  }

  // initialize queue, reset touched operators
  df._touched.forEach(function(op) { df._enqueue(op, true); });
  df._touched = UniqueList(id);

  try {
    while (df._heap.size() > 0) {
      op = df._heap.pop();

      // re-queue if rank changes
      if (op.rank !== op.qrank) { df._enqueue(op, true); continue; }

      // otherwise, evaluate the operator
      next = op.run(df._getPulse(op, encode));

      if (level >= Debug) {
        df.debug(op.id, next === StopPropagation ? 'STOP' : next, op);
      }

      // propagate the pulse
      if (next !== StopPropagation) {
        df._pulse = next;
        if (op._targets) op._targets.forEach(function(op) { df._enqueue(op); });
      }

      // increment visit counter
      ++count;
    }
  } catch (err) {
    error = err;
  }

  // reset pulse map
  df._pulses = {};
  df._pulse = null;

  if (level >= Info) {
    dt = Date.now() - dt;
    df.info('> Pulse ' + df._clock + ': ' + count + ' operators; ' + dt + 'ms');
  }

  if (error) {
    df._postrun = [];
    df.error(error);
  }

  if (df._onrun) {
    try { df._onrun(df, count, error); } catch (err) { df.error(err); }
  }

  // invoke callbacks queued via runAfter
  if (df._postrun.length) {
    var postrun = df._postrun;
    df._postrun = [];
    postrun.forEach(function(f) {
      try { f(df); } catch (err) { df.error(err); }
    });
  }

  return count;
}

/**
 * Runs the dataflow and returns a Promise that resolves when the
 * propagation cycle completes. The standard run method may exit early
 * if there are pending data loading operations. In contrast, this
 * method returns a Promise to allow callers to receive notification
 * when dataflow evaluation completes.
 * @return {Promise} - A promise that resolves to this dataflow.
 */
function runAsync() {
  return this._pending || Promise.resolve(this.run());
}

/**
 * Schedules a callback function to be invoked after the current pulse
 * propagation completes. If no propagation is currently occurring,
 * the function is invoked immediately.
 * @param {function(Dataflow)} callback - The callback function to run.
 *   The callback will be invoked with this Dataflow instance as its
 *   sole argument.
 * @param {boolean} enqueue - A boolean flag indicating that the
 *   callback should be queued up to run after the next propagation
 *   cycle, suppressing immediate invovation when propagation is not
 *   currently occurring.
 */
function runAfter(callback, enqueue) {
  if (this._pulse || enqueue) {
    // pulse propagation is currently running, queue to run after
    this._postrun.push(callback);
  } else {
    // pulse propagation already complete, invoke immediately
    try { callback(this); } catch (err) { this.error(err); }
  }
}

/**
 * Enqueue an operator into the priority queue for evaluation. The operator
 * will be enqueued if it has no registered pulse for the current cycle, or if
 * the force argument is true. Upon enqueue, this method also sets the
 * operator's qrank to the current rank value.
 * @param {Operator} op - The operator to enqueue.
 * @param {boolean} [force] - A flag indicating if the operator should be
 *   forceably added to the queue, even if it has already been previously
 *   enqueued during the current pulse propagation. This is useful when the
 *   dataflow graph is dynamically modified and the operator rank changes.
 */
function enqueue(op, force) {
  var p = !this._pulses[op.id];
  if (p) this._pulses[op.id] = this._pulse;
  if (p || force) {
    op.qrank = op.rank;
    this._heap.push(op);
  }
}

/**
 * Provide a correct pulse for evaluating an operator. If the operator has an
 * explicit source operator, we will try to pull the pulse(s) from it.
 * If there is an array of source operators, we build a multi-pulse.
 * Otherwise, we return a current pulse with correct source data.
 * If the pulse is the pulse map has an explicit target set, we use that.
 * Else if the pulse on the upstream source operator is current, we use that.
 * Else we use the pulse from the pulse map, but copy the source tuple array.
 * @param {Operator} op - The operator for which to get an input pulse.
 * @param {string} [encode] - An (optional) encoding set name with which to
 *   annotate the returned pulse. See {@link run} for more information.
 */
function getPulse(op, encode) {
  var s = op.source,
      stamp = this._clock,
      p;

  if (s && isArray(s)) {
    p = s.map(function(_) { return _.pulse; });
    return new MultiPulse(this, stamp, p, encode);
  } else {
    s = s && s.pulse;
    p = this._pulses[op.id];
    if (s && s !== StopPropagation) {
      if (s.stamp === stamp && p.target !== op) p = s;
      else p.source = s.source;
    }
    return p;
  }
}

var NO_OPT = {skip: false, force: false};

/**
 * Touches an operator, scheduling it to be evaluated. If invoked outside of
 * a pulse propagation, the operator will be evaluated the next time this
 * dataflow is run. If invoked in the midst of pulse propagation, the operator
 * will be queued for evaluation if and only if the operator has not yet been
 * evaluated on the current propagation timestamp.
 * @param {Operator} op - The operator to touch.
 * @param {object} [options] - Additional options hash.
 * @param {boolean} [options.skip] - If true, the operator will
 *   be skipped: it will not be evaluated, but its dependents will be.
 * @return {Dataflow}
 */
function touch(op, options) {
  var opt = options || NO_OPT;
  if (this._pulse) {
    // if in midst of propagation, add to priority queue
    this._enqueue(op);
  } else {
    // otherwise, queue for next propagation
    this._touched.add(op);
  }
  if (opt.skip) op.skip(true);
  return this;
}

/**
 * Updates the value of the given operator.
 * @param {Operator} op - The operator to update.
 * @param {*} value - The value to set.
 * @param {object} [options] - Additional options hash.
 * @param {boolean} [options.force] - If true, the operator will
 *   be re-evaluated even if its value has not changed.
 * @param {boolean} [options.skip] - If true, the operator will
 *   be skipped: it will not be evaluated, but its dependents will be.
 * @return {Dataflow}
 */
function update(op, value, options) {
  var opt = options || NO_OPT;
  if (op.set(value) || opt.force) {
    this.touch(op, opt);
  }
  return this;
}

/**
 * Pulses an operator with a changeset of tuples. If invoked outside of
 * a pulse propagation, the pulse will be applied the next time this
 * dataflow is run. If invoked in the midst of pulse propagation, the pulse
 * will be added to the set of active pulses and will be applied if and
 * only if the target operator has not yet been evaluated on the current
 * propagation timestamp.
 * @param {Operator} op - The operator to pulse.
 * @param {ChangeSet} value - The tuple changeset to apply.
 * @param {object} [options] - Additional options hash.
 * @param {boolean} [options.skip] - If true, the operator will
 *   be skipped: it will not be evaluated, but its dependents will be.
 * @return {Dataflow}
 */
function pulse(op, changeset, options) {
  this.touch(op, options || NO_OPT);

  var p = new Pulse(this, this._clock + (this._pulse ? 0 : 1)),
      t = op.pulse && op.pulse.source || [];
  p.target = op;
  this._pulses[op.id] = changeset.pulse(p, t);

  return this;
}

function Heap(comparator) {
  this.cmp = comparator;
  this.nodes = [];
}

var prototype$6 = Heap.prototype;

prototype$6.size = function() {
  return this.nodes.length;
};

prototype$6.clear = function() {
  this.nodes = [];
  return this;
};

prototype$6.peek = function() {
  return this.nodes[0];
};

prototype$6.push = function(x) {
  var array = this.nodes;
  array.push(x);
  return siftdown(array, 0, array.length-1, this.cmp);
};

prototype$6.pop = function() {
  var array = this.nodes,
      last = array.pop(),
      item;

  if (array.length) {
    item = array[0];
    array[0] = last;
    siftup(array, 0, this.cmp);
  } else {
    item = last;
  }
  return item;
};

prototype$6.replace = function(item) {
  var array = this.nodes,
      retval = array[0];
  array[0] = item;
  siftup(array, 0, this.cmp);
  return retval;
};

prototype$6.pushpop = function(item) {
  var array = this.nodes, ref = array[0];
  if (array.length && this.cmp(ref, item) < 0) {
    array[0] = item;
    item = ref;
    siftup(array, 0, this.cmp);
  }
  return item;
};

function siftdown(array, start, idx, cmp) {
  var item, parent, pidx;

  item = array[idx];
  while (idx > start) {
    pidx = (idx - 1) >> 1;
    parent = array[pidx];
    if (cmp(item, parent) < 0) {
      array[idx] = parent;
      idx = pidx;
      continue;
    }
    break;
  }
  return (array[idx] = item);
}

function siftup(array, idx, cmp) {
  var start = idx,
      end = array.length,
      item = array[idx],
      cidx = 2 * idx + 1, ridx;

  while (cidx < end) {
    ridx = cidx + 1;
    if (ridx < end && cmp(array[cidx], array[ridx]) >= 0) {
      cidx = ridx;
    }
    array[idx] = array[cidx];
    idx = cidx;
    cidx = 2 * idx + 1;
  }
  array[idx] = item;
  return siftdown(array, start, idx, cmp);
}

/**
 * A dataflow graph for reactive processing of data streams.
 * @constructor
 */
function Dataflow() {
  this._log = logger();
  this.logLevel(Error$1);

  this._clock = 0;
  this._rank = 0;
  try {
    this._loader = vegaLoader.loader();
  } catch (e) {
    // do nothing if loader module is unavailable
  }

  this._touched = UniqueList(id);
  this._pulses = {};
  this._pulse = null;

  this._heap = new Heap(function(a, b) { return a.qrank - b.qrank; });
  this._postrun = [];
}

var prototype = Dataflow.prototype;

/**
 * The current timestamp of this dataflow. This value reflects the
 * timestamp of the previous dataflow run. The dataflow is initialized
 * with a stamp value of 0. The initial run of the dataflow will have
 * a timestap of 1, and so on. This value will match the
 * {@link Pulse.stamp} property.
 * @return {number} - The current timestamp value.
 */
prototype.stamp = function() {
  return this._clock;
};

/**
 * Gets or sets the loader instance to use for data file loading. A
 * loader object must provide a "load" method for loading files and a
 * "sanitize" method for checking URL/filename validity. Both methods
 * should accept a URI and options hash as arguments, and return a Promise
 * that resolves to the loaded file contents (load) or a hash containing
 * sanitized URI data with the sanitized url assigned to the "href" property
 * (sanitize).
 * @param {object} _ - The loader instance to use.
 * @return {object|Dataflow} - If no arguments are provided, returns
 *   the current loader instance. Otherwise returns this Dataflow instance.
 */
prototype.loader = function(_) {
  if (arguments.length) {
    this._loader = _;
    return this;
  } else {
    return this._loader;
  }
};

/**
 * Empty entry threshold for garbage cleaning. Map data structures will
 * perform cleaning once the number of empty entries exceeds this value.
 */
prototype.cleanThreshold = 1e4;

// OPERATOR REGISTRATION
prototype.add = add;
prototype.connect = connect;
prototype.rank = rank;
prototype.rerank = rerank;

// OPERATOR UPDATES
prototype.pulse = pulse;
prototype.touch = touch;
prototype.update = update;
prototype.changeset = changeset;

// DATA LOADING
prototype.ingest = ingest$1;
prototype.request = request;

// EVENT HANDLING
prototype.events = events;
prototype.on = on;

// PULSE PROPAGATION
prototype.run = run;
prototype.runAsync = runAsync;
prototype.runAfter = runAfter;
prototype._enqueue = enqueue;
prototype._getPulse = getPulse;

// LOGGING AND ERROR HANDLING

function logMethod(method) {
  return function() {
    return this._log[method].apply(this, arguments);
  };
}

/**
 * Logs an error message. By default, logged messages are written to console
 * output. The message will only be logged if the current log level is high
 * enough to permit error messages.
 */
prototype.error = logMethod('error');

/**
 * Logs a warning message. By default, logged messages are written to console
 * output. The message will only be logged if the current log level is high
 * enough to permit warning messages.
 */
prototype.warn = logMethod('warn');

/**
 * Logs a information message. By default, logged messages are written to
 * console output. The message will only be logged if the current log level is
 * high enough to permit information messages.
 */
prototype.info = logMethod('info');

/**
 * Logs a debug message. By default, logged messages are written to console
 * output. The message will only be logged if the current log level is high
 * enough to permit debug messages.
 */
prototype.debug = logMethod('debug');

/**
 * Get or set the current log level. If an argument is provided, it
 * will be used as the new log level.
 * @param {number} [level] - Should be one of None, Warn, Info
 * @return {number} - The current log level.
 */
prototype.logLevel = logMethod('level');

/**
 * Abstract class for operators that process data tuples.
 * Subclasses must provide a {@link transform} method for operator processing.
 * @constructor
 * @param {*} [init] - The initial value for this operator.
 * @param {object} [params] - The parameters for this operator.
 * @param {Operator} [source] - The operator from which to receive pulses.
 */
function Transform(init, params) {
  Operator.call(this, init, null, params);
}

var prototype$7 = inherits(Transform, Operator);

/**
 * Overrides {@link Operator.evaluate} for transform operators.
 * Internally, this method calls {@link evaluate} to perform processing.
 * If {@link evaluate} returns a falsy value, the input pulse is returned.
 * This method should NOT be overridden, instead overrride {@link evaluate}.
 * @param {Pulse} pulse - the current dataflow pulse.
 * @return the output pulse for this operator (or StopPropagation)
 */
prototype$7.run = function(pulse) {
  if (pulse.stamp <= this.stamp) return pulse.StopPropagation;

  var rv;
  if (this.skip()) {
    this.skip(false);
  } else {
    rv = this.evaluate(pulse);
  }
  rv = rv || pulse;

  if (rv !== pulse.StopPropagation) this.pulse = rv;
  this.stamp = pulse.stamp;

  return rv;
};

/**
 * Overrides {@link Operator.evaluate} for transform operators.
 * Marshalls parameter values and then invokes {@link transform}.
 * @param {Pulse} pulse - the current dataflow pulse.
 * @return {Pulse} The output pulse (or StopPropagation). A falsy return
     value (including undefined) will let the input pulse pass through.
 */
prototype$7.evaluate = function(pulse) {
  var params = this.marshall(pulse.stamp),
      out = this.transform(params, pulse);
  params.clear();
  return out;
};

/**
 * Process incoming pulses.
 * Subclasses should override this method to implement transforms.
 * @param {Parameters} _ - The operator parameter values.
 * @param {Pulse} pulse - The current dataflow pulse.
 * @return {Pulse} The output pulse (or StopPropagation). A falsy return
 *   value (including undefined) will let the input pulse pass through.
 */
prototype$7.transform = function() {};

// Utilities

const runtime = new Dataflow().logLevel(Warn);

let listeners = [];

runtime.addDataListener = function(op, callback) {
  listeners.push({op: op, fn: callback});
};

runtime.removeDataListener = function(op, callback) {
  let v = null;
  for (let l of listeners) {
    if (l.op === op && l.fn === callback) {
      v = l; break;
    }
  }
  if (v) {
    listeners = listeners.filter(l => l !== v);
  }
};

runtime._onrun = function() {
  let s = runtime.stamp(),
      a = listeners.filter(l => l.op.stamp === s);
  if (a.length) {
    setTimeout(function() {
      a.forEach(l => l.fn(l.op.value));
    }, 0);
  }
};

function removeParams(params, names) {
  names = toSet(array(names));
  return params.filter(p => !names[p.name]);
}

function extendParams(params, map) {
  return params.map(p => {
    let name = p.name;
    return map[name] ? extend({}, p, map[name]) : p;
  });
}

function multikey(f) {
  return function(x) {
    var n = f.length,
        i = 1,
        k = String(f[0](x));

    for (; i<n; ++i) {
      k += '|' + f[i](x);
    }

    return k;
  };
}

function groupkey(fields) {
  return !fields || !fields.length ? function() { return ''; }
    : fields.length === 1 ? fields[0]
    : multikey(fields);
}

function measureName(op, field, as) {
  return as || (op + (!field ? '' : '_' + field));
}

var AggregateOps$1 = {
  'values': measure({
    name: 'values',
    init: 'cell.store = true;',
    set:  'cell.data.values()', idx: -1
  }),
  'count': measure({
    name: 'count',
    set:  'cell.num'
  }),
  'missing': measure({
    name: 'missing',
    set:  'this.missing'
  }),
  'valid': measure({
    name: 'valid',
    set:  'this.valid'
  }),
  'sum': measure({
    name: 'sum',
    init: 'this.sum = 0;',
    add:  'this.sum += v;',
    rem:  'this.sum -= v;',
    set:  'this.sum'
  }),
  'mean': measure({
    name: 'mean',
    init: 'this.mean = 0;',
    add:  'var d = v - this.mean; this.mean += d / this.valid;',
    rem:  'var d = v - this.mean; this.mean -= this.valid ? d / this.valid : this.mean;',
    set:  'this.mean'
  }),
  'average': measure({
    name: 'average',
    set:  'this.mean',
    req:  ['mean'], idx: 1
  }),
  'variance': measure({
    name: 'variance',
    init: 'this.dev = 0;',
    add:  'this.dev += d * (v - this.mean);',
    rem:  'this.dev -= d * (v - this.mean);',
    set:  'this.valid > 1 ? this.dev / (this.valid-1) : 0',
    req:  ['mean'], idx: 1
  }),
  'variancep': measure({
    name: 'variancep',
    set:  'this.valid > 1 ? this.dev / this.valid : 0',
    req:  ['variance'], idx: 2
  }),
  'stdev': measure({
    name: 'stdev',
    set:  'this.valid > 1 ? Math.sqrt(this.dev / (this.valid-1)) : 0',
    req:  ['variance'], idx: 2
  }),
  'stdevp': measure({
    name: 'stdevp',
    set:  'this.valid > 1 ? Math.sqrt(this.dev / this.valid) : 0',
    req:  ['variance'], idx: 2
  }),
  'stderr': measure({
    name: 'stderr',
    set:  'this.valid > 1 ? Math.sqrt(this.dev / (this.valid * (this.valid-1))) : 0',
    req:  ['variance'], idx: 2
  }),
  'distinct': measure({
    name: 'distinct',
    set:  'cell.data.distinct(this.get)',
    req:  ['values'], idx: 3
  }),
  'ci0': measure({
    name: 'ci0',
    set:  'cell.data.ci0(this.get)',
    req:  ['values'], idx: 3
  }),
  'ci1': measure({
    name: 'ci1',
    set:  'cell.data.ci1(this.get)',
    req:  ['values'], idx: 3
  }),
  'median': measure({
    name: 'median',
    set:  'cell.data.q2(this.get)',
    req:  ['values'], idx: 3
  }),
  'q1': measure({
    name: 'q1',
    set:  'cell.data.q1(this.get)',
    req:  ['values'], idx: 3
  }),
  'q3': measure({
    name: 'q3',
    set:  'cell.data.q3(this.get)',
    req:  ['values'], idx: 3
  }),
  'argmin': measure({
    name: 'argmin',
    init: 'this.argmin = null;',
    add:  'if (v < this.min) this.argmin = t;',
    rem:  'if (v <= this.min) this.argmin = null;',
    set:  'this.argmin || cell.data.argmin(this.get)',
    req:  ['min'], str: ['values'], idx: 3
  }),
  'argmax': measure({
    name: 'argmax',
    init: 'this.argmax = null;',
    add:  'if (v > this.max) this.argmax = t;',
    rem:  'if (v >= this.max) this.argmax = null;',
    set:  'this.argmax || cell.data.argmax(this.get)',
    req:  ['max'], str: ['values'], idx: 3
  }),
  'min': measure({
    name: 'min',
    init: 'this.min = null;',
    add:  'if (v < this.min || this.min === null) this.min = v;',
    rem:  'if (v <= this.min) this.min = NaN;',
    set:  'this.min = (isNaN(this.min) ? cell.data.min(this.get) : this.min)',
    str:  ['values'], idx: 4
  }),
  'max': measure({
    name: 'max',
    init: 'this.max = null;',
    add:  'if (v > this.max || this.max === null) this.max = v;',
    rem:  'if (v >= this.max) this.max = NaN;',
    set:  'this.max = (isNaN(this.max) ? cell.data.max(this.get) : this.max)',
    str:  ['values'], idx: 4
  })
};

var ValidAggregateOps = Object.keys(AggregateOps$1);

function createMeasure(op, name) {
  return AggregateOps$1[op](name);
}

function measure(base) {
  return function(out) {
    var m = extend({init:'', add:'', rem:'', idx:0}, base);
    m.out = out || base.name;
    return m;
  };
}

function compareIndex(a, b) {
  return a.idx - b.idx;
}

function resolve(agg, stream) {
  function collect(m, a) {
    function helper(r) { if (!m[r]) collect(m, m[r] = AggregateOps$1[r]()); }
    if (a.req) a.req.forEach(helper);
    if (stream && a.str) a.str.forEach(helper);
    return m;
  }
  var map = agg.reduce(
    collect,
    agg.reduce(function(m, a) {
      m[a.name] = a;
      return m;
    }, {})
  );
  var values = [], key;
  for (key in map) values.push(map[key]);
  return values.sort(compareIndex);
}

function compileMeasures(agg, field) {
  var get = field || identity,
      all = resolve(agg, true), // assume streaming removes may occur
      init = 'var cell = this.cell; this.valid = 0; this.missing = 0;',
      ctr = 'this.cell = cell; this.init();',
      add = 'if(v==null){++this.missing; return;} if(v!==v) return; ++this.valid;',
      rem = 'if(v==null){--this.missing; return;} if(v!==v) return; --this.valid;',
      set = 'var cell = this.cell;';

  all.forEach(function(a) {
    init += a.init;
    add += a.add;
    rem += a.rem;
  });
  agg.slice().sort(compareIndex).forEach(function(a) {
    set += 't[\'' + a.out + '\']=' + a.set + ';';
  });
  set += 'return t;';

  ctr = Function('cell', ctr);
  ctr.prototype.init = Function(init);
  ctr.prototype.add = Function('v', 't', add);
  ctr.prototype.rem = Function('v', 't', rem);
  ctr.prototype.set = Function('t', set);
  ctr.prototype.get = get;
  ctr.fields = agg.map(function(_) { return _.out; });
  return ctr;
}

var bin = function(_) {
  // determine range
  var maxb = _.maxbins || 20,
      base = _.base || 10,
      logb = Math.log(base),
      div  = _.divide || [5, 2],
      min  = _.extent[0],
      max  = _.extent[1],
      span = max - min,
      step, level, minstep, precision, v, i, n, eps;

  if (_.step) {
    // if step size is explicitly given, use that
    step = _.step;
  } else if (_.steps) {
    // if provided, limit choice to acceptable step sizes
    v = span / maxb;
    for (i=0, n=_.steps.length; i < n && _.steps[i] < v; ++i);
    step = _.steps[Math.max(0, i-1)];
  } else {
    // else use span to determine step size
    level = Math.ceil(Math.log(maxb) / logb);
    minstep = _.minstep || 0;
    step = Math.max(
      minstep,
      Math.pow(base, Math.round(Math.log(span) / logb) - level)
    );

    // increase step size if too many bins
    while (Math.ceil(span/step) > maxb) { step *= base; }

    // decrease step size if allowed
    for (i=0, n=div.length; i<n; ++i) {
      v = step / div[i];
      if (v >= minstep && span / v <= maxb) step = v;
    }
  }

  // update precision, min and max
  v = Math.log(step);
  precision = v >= 0 ? 0 : ~~(-v / logb) + 1;
  eps = Math.pow(base, -precision - 1);
  if (_.nice || _.nice === undefined) {
    v = Math.floor(min / step + eps) * step;
    min = min < v ? v - step : v;
    max = Math.ceil(max / step) * step;
  }

  return {
    start: min,
    stop:  max,
    step:  step
  };
};

var numbers = function(array, f) {
  var numbers = [],
      n = array.length,
      i = -1, a;

  if (f == null) {
    while (++i < n) if (!isNaN(a = number(array[i]))) numbers.push(a);
  } else {
    while (++i < n) if (!isNaN(a = number(f(array[i], i, array)))) numbers.push(a);
  }
  return numbers;
};

function number(x) {
  return x === null ? NaN : +x;
}

var random = Math.random;

var ascending = function(a, b) {
  return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
};

var bisector = function(compare) {
  if (compare.length === 1) compare = ascendingComparator(compare);
  return {
    left: function(a, x, lo, hi) {
      if (lo == null) lo = 0;
      if (hi == null) hi = a.length;
      while (lo < hi) {
        var mid = lo + hi >>> 1;
        if (compare(a[mid], x) < 0) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    },
    right: function(a, x, lo, hi) {
      if (lo == null) lo = 0;
      if (hi == null) hi = a.length;
      while (lo < hi) {
        var mid = lo + hi >>> 1;
        if (compare(a[mid], x) > 0) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    }
  };
};

function ascendingComparator(f) {
  return function(d, x) {
    return ascending(f(d), x);
  };
}

var ascendingBisect = bisector(ascending);

var number$1 = function(x) {
  return x === null ? NaN : +x;
};

var variance = function(values, valueof) {
  var n = values.length,
      m = 0,
      i = -1,
      mean = 0,
      value,
      delta,
      sum = 0;

  if (valueof == null) {
    while (++i < n) {
      if (!isNaN(value = number$1(values[i]))) {
        delta = value - mean;
        mean += delta / ++m;
        sum += delta * (value - mean);
      }
    }
  }

  else {
    while (++i < n) {
      if (!isNaN(value = number$1(valueof(values[i], i, values)))) {
        delta = value - mean;
        mean += delta / ++m;
        sum += delta * (value - mean);
      }
    }
  }

  if (m > 1) return sum / (m - 1);
};

var extent = function(values, valueof) {
  var n = values.length,
      i = -1,
      value,
      min,
      max;

  if (valueof == null) {
    while (++i < n) { // Find the first comparable value.
      if ((value = values[i]) != null && value >= value) {
        min = max = value;
        while (++i < n) { // Compare the remaining values.
          if ((value = values[i]) != null) {
            if (min > value) min = value;
            if (max < value) max = value;
          }
        }
      }
    }
  }

  else {
    while (++i < n) { // Find the first comparable value.
      if ((value = valueof(values[i], i, values)) != null && value >= value) {
        min = max = value;
        while (++i < n) { // Compare the remaining values.
          if ((value = valueof(values[i], i, values)) != null) {
            if (min > value) min = value;
            if (max < value) max = value;
          }
        }
      }
    }
  }

  return [min, max];
};

var range = function(start, stop, step) {
  start = +start, stop = +stop, step = (n = arguments.length) < 2 ? (stop = start, start = 0, 1) : n < 3 ? 1 : +step;

  var i = -1,
      n = Math.max(0, Math.ceil((stop - start) / step)) | 0,
      range = new Array(n);

  while (++i < n) {
    range[i] = start + i * step;
  }

  return range;
};

var quantile = function(values, p, valueof) {
  if (valueof == null) valueof = number$1;
  if (!(n = values.length)) return;
  if ((p = +p) <= 0 || n < 2) return +valueof(values[0], 0, values);
  if (p >= 1) return +valueof(values[n - 1], n - 1, values);
  var n,
      i = (n - 1) * p,
      i0 = Math.floor(i),
      value0 = +valueof(values[i0], i0, values),
      value1 = +valueof(values[i0 + 1], i0 + 1, values);
  return value0 + (value1 - value0) * (i - i0);
};

var max = function(values, valueof) {
  var n = values.length,
      i = -1,
      value,
      max;

  if (valueof == null) {
    while (++i < n) { // Find the first comparable value.
      if ((value = values[i]) != null && value >= value) {
        max = value;
        while (++i < n) { // Compare the remaining values.
          if ((value = values[i]) != null && value > max) {
            max = value;
          }
        }
      }
    }
  }

  else {
    while (++i < n) { // Find the first comparable value.
      if ((value = valueof(values[i], i, values)) != null && value >= value) {
        max = value;
        while (++i < n) { // Compare the remaining values.
          if ((value = valueof(values[i], i, values)) != null && value > max) {
            max = value;
          }
        }
      }
    }
  }

  return max;
};

var mean = function(values, valueof) {
  var n = values.length,
      m = n,
      i = -1,
      value,
      sum = 0;

  if (valueof == null) {
    while (++i < n) {
      if (!isNaN(value = number$1(values[i]))) sum += value;
      else --m;
    }
  }

  else {
    while (++i < n) {
      if (!isNaN(value = number$1(valueof(values[i], i, values)))) sum += value;
      else --m;
    }
  }

  if (m) return sum / m;
};

var median = function(values, valueof) {
  var n = values.length,
      i = -1,
      value,
      numbers = [];

  if (valueof == null) {
    while (++i < n) {
      if (!isNaN(value = number$1(values[i]))) {
        numbers.push(value);
      }
    }
  }

  else {
    while (++i < n) {
      if (!isNaN(value = number$1(valueof(values[i], i, values)))) {
        numbers.push(value);
      }
    }
  }

  return quantile(numbers.sort(ascending), 0.5);
};

var min = function(values, valueof) {
  var n = values.length,
      i = -1,
      value,
      min;

  if (valueof == null) {
    while (++i < n) { // Find the first comparable value.
      if ((value = values[i]) != null && value >= value) {
        min = value;
        while (++i < n) { // Compare the remaining values.
          if ((value = values[i]) != null && min > value) {
            min = value;
          }
        }
      }
    }
  }

  else {
    while (++i < n) { // Find the first comparable value.
      if ((value = valueof(values[i], i, values)) != null && value >= value) {
        min = value;
        while (++i < n) { // Compare the remaining values.
          if ((value = valueof(values[i], i, values)) != null && min > value) {
            min = value;
          }
        }
      }
    }
  }

  return min;
};

var bootstrapCI = function(array, samples, alpha, f) {
  var values = numbers(array, f),
      n = values.length,
      m = samples,
      a, i, j, mu;

  for (j=0, mu=Array(m); j<m; ++j) {
    for (a=0, i=0; i<n; ++i) {
      a += values[~~(random() * n)];
    }
    mu[j] = a / n;
  }

  return [
    quantile(mu.sort(ascending), alpha/2),
    quantile(mu, 1-(alpha/2))
  ];
};

var quartiles = function(array, f) {
  var values = numbers(array, f);

  return [
    quantile(values.sort(ascending), 0.25),
    quantile(values, 0.50),
    quantile(values, 0.75)
  ];
};

var randomNormal = function(mean, stdev) {
  var mu,
      sigma,
      next = NaN,
      dist = {};

  dist.mean = function(_) {
    if (arguments.length) {
      mu = _ || 0;
      next = NaN;
      return dist;
    } else {
      return mu;
    }
  };

  dist.stdev = function(_) {
    if (arguments.length) {
      sigma = _ == null ? 1 : _;
      next = NaN;
      return dist;
    } else {
      return sigma;
    }
  };

  dist.sample = function() {
    var x = 0, y = 0, rds, c;
    if (next === next) {
      x = next;
      next = NaN;
      return x;
    }
    do {
      x = random() * 2 - 1;
      y = random() * 2 - 1;
      rds = x * x + y * y;
    } while (rds === 0 || rds > 1);
    c = Math.sqrt(-2 * Math.log(rds) / rds); // Box-Muller transform
    next = mu + y * c * sigma;
    return mu + x * c * sigma;
  };

  dist.pdf = function(x) {
    var exp = Math.exp(Math.pow(x-mu, 2) / (-2 * Math.pow(sigma, 2)));
    return (1 / (sigma * Math.sqrt(2*Math.PI))) * exp;
  };

  // Approximation from West (2009)
  // Better Approximations to Cumulative Normal Functions
  dist.cdf = function(x) {
    var cd,
        z = (x - mu) / sigma,
        Z = Math.abs(z);
    if (Z > 37) {
      cd = 0;
    } else {
      var sum, exp = Math.exp(-Z*Z/2);
      if (Z < 7.07106781186547) {
        sum = 3.52624965998911e-02 * Z + 0.700383064443688;
        sum = sum * Z + 6.37396220353165;
        sum = sum * Z + 33.912866078383;
        sum = sum * Z + 112.079291497871;
        sum = sum * Z + 221.213596169931;
        sum = sum * Z + 220.206867912376;
        cd = exp * sum;
        sum = 8.83883476483184e-02 * Z + 1.75566716318264;
        sum = sum * Z + 16.064177579207;
        sum = sum * Z + 86.7807322029461;
        sum = sum * Z + 296.564248779674;
        sum = sum * Z + 637.333633378831;
        sum = sum * Z + 793.826512519948;
        sum = sum * Z + 440.413735824752;
        cd = cd / sum;
      } else {
        sum = Z + 0.65;
        sum = Z + 4 / sum;
        sum = Z + 3 / sum;
        sum = Z + 2 / sum;
        sum = Z + 1 / sum;
        cd = exp / sum / 2.506628274631;
      }
    }
    return z > 0 ? 1 - cd : cd;
  };

  // Approximation of Probit function using inverse error function.
  dist.icdf = function(p) {
    if (p <= 0 || p >= 1) return NaN;
    var x = 2*p - 1,
        v = (8 * (Math.PI - 3)) / (3 * Math.PI * (4-Math.PI)),
        a = (2 / (Math.PI*v)) + (Math.log(1 - Math.pow(x,2)) / 2),
        b = Math.log(1 - (x*x)) / v,
        s = (x > 0 ? 1 : -1) * Math.sqrt(Math.sqrt((a*a) - b) - a);
    return mu + sigma * Math.SQRT2 * s;
  };

  return dist.mean(mean).stdev(stdev);
};

// TODO: support for additional kernels?
var randomKDE = function(support, bandwidth) {
  var kernel = randomNormal(),
      dist = {},
      n = 0;

  dist.data = function(_) {
    if (arguments.length) {
      support = _;
      n = _ ? _.length : 0;
      return dist.bandwidth(bandwidth);
    } else {
      return support;
    }
  };

  dist.bandwidth = function(_) {
    if (!arguments.length) return bandwidth;
    bandwidth = _;
    if (!bandwidth && support) bandwidth = estimateBandwidth(support);
    return dist;
  };

  dist.sample = function() {
    return support[~~(random() * n)] + bandwidth * kernel.sample();
  };

  dist.pdf = function(x) {
    for (var y=0, i=0; i<n; ++i) {
      y += kernel.pdf((x - support[i]) / bandwidth);
    }
    return y / bandwidth / n;
  };

  dist.cdf = function(x) {
    for (var y=0, i=0; i<n; ++i) {
      y += kernel.cdf((x - support[i]) / bandwidth);
    }
    return y / n;
  };

  dist.icdf = function() {
    throw Error('KDE icdf not supported.');
  };

  return dist.data(support);
};

// Scott, D. W. (1992) Multivariate Density Estimation:
// Theory, Practice, and Visualization. Wiley.
function estimateBandwidth(array) {
  var n = array.length,
      q = quartiles(array),
      h = (q[2] - q[0]) / 1.34;
  return 1.06 * Math.min(Math.sqrt(variance(array)), h) * Math.pow(n, -0.2);
}

var randomMixture = function(dists, weights) {
  var dist = {}, m = 0, w;

  function normalize(x) {
    var w = [], sum = 0, i;
    for (i=0; i<m; ++i) { sum += (w[i] = (x[i]==null ? 1 : +x[i])); }
    for (i=0; i<m; ++i) { w[i] /= sum; }
    return w;
  }

  dist.weights = function(_) {
    if (arguments.length) {
      w = normalize(weights = (_ || []));
      return dist;
    }
    return weights;
  };

  dist.distributions = function(_) {
    if (arguments.length) {
      if (_) {
        m = _.length;
        dists = _;
      } else {
        m = 0;
        dists = [];
      }
      return dist.weights(weights);
    }
    return dists;
  };

  dist.sample = function() {
    var r = random(),
        d = dists[m-1],
        v = w[0],
        i = 0;

    // first select distribution
    for (; i<m-1; v += w[++i]) {
      if (r < v) { d = dists[i]; break; }
    }
    // then sample from it
    return d.sample();
  };

  dist.pdf = function(x) {
    for (var p=0, i=0; i<m; ++i) {
      p += w[i] * dists[i].pdf(x);
    }
    return p;
  };

  dist.cdf = function(x) {
    for (var p=0, i=0; i<m; ++i) {
      p += w[i] * dists[i].cdf(x);
    }
    return p;
  };

  dist.icdf = function() {
    throw Error('Mixture icdf not supported.');
  };

  return dist.distributions(dists).weights(weights);
};

var randomUniform = function(min, max) {
  if (max == null) {
    max = (min == null ? 1 : min);
    min = 0;
  }

  var dist = {},
      a, b, d;

  dist.min = function(_) {
    if (arguments.length) {
      a = _ || 0;
      d = b - a;
      return dist;
    } else {
      return a;
    }
  };

  dist.max = function(_) {
    if (arguments.length) {
      b = _ || 0;
      d = b - a;
      return dist;
    } else {
      return b;
    }
  };

  dist.sample = function() {
    return a + d * random();
  };

  dist.pdf = function(x) {
    return (x >= a && x <= b) ? 1 / d : 0;
  };

  dist.cdf = function(x) {
    return x < a ? 0 : x > b ? 1 : (x - a) / d;
  };

  dist.icdf = function(p) {
    return (p >= 0 && p <= 1) ? a + p * d : NaN;
  };

  return dist.min(min).max(max);
};

function TupleStore(key) {
  this._key = key ? field(key) : tupleid;
  this.reset();
}

var prototype$9 = TupleStore.prototype;

prototype$9.reset = function() {
  this._add = [];
  this._rem = [];
  this._ext = null;
  this._get = null;
  this._q = null;
};

prototype$9.add = function(v) {
  this._add.push(v);
};

prototype$9.rem = function(v) {
  this._rem.push(v);
};

prototype$9.values = function() {
  this._get = null;
  if (this._rem.length === 0) return this._add;

  var a = this._add,
      r = this._rem,
      k = this._key,
      n = a.length,
      m = r.length,
      x = Array(n - m),
      map = {}, i, j, v;

  // use unique key field to clear removed values
  for (i=0; i<m; ++i) {
    map[k(r[i])] = 1;
  }
  for (i=0, j=0; i<n; ++i) {
    if (map[k(v = a[i])]) {
      map[k(v)] = 0;
    } else {
      x[j++] = v;
    }
  }

  this._rem = [];
  return (this._add = x);
};

// memoizing statistics methods

prototype$9.distinct = function(get) {
  var v = this.values(),
      n = v.length,
      map = {},
      count = 0, s;

  while (--n >= 0) {
    s = get(v[n]) + '';
    if (!map.hasOwnProperty(s)) {
      map[s] = 1;
      ++count;
    }
  }

  return count;
};

prototype$9.extent = function(get) {
  if (this._get !== get || !this._ext) {
    var v = this.values(),
        i = extentIndex(v, get);
    this._ext = [v[i[0]], v[i[1]]];
    this._get = get;
  }
  return this._ext;
};

prototype$9.argmin = function(get) {
  return this.extent(get)[0] || {};
};

prototype$9.argmax = function(get) {
  return this.extent(get)[1] || {};
};

prototype$9.min = function(get) {
  var m = this.extent(get)[0];
  return m != null ? get(m) : +Infinity;
};

prototype$9.max = function(get) {
  var m = this.extent(get)[1];
  return m != null ? get(m) : -Infinity;
};

prototype$9.quartile = function(get) {
  if (this._get !== get || !this._q) {
    this._q = quartiles(this.values(), get);
    this._get = get;
  }
  return this._q;
};

prototype$9.q1 = function(get) {
  return this.quartile(get)[0];
};

prototype$9.q2 = function(get) {
  return this.quartile(get)[1];
};

prototype$9.q3 = function(get) {
  return this.quartile(get)[2];
};

prototype$9.ci = function(get) {
  if (this._get !== get || !this._ci) {
    this._ci = bootstrapCI(this.values(), 1000, 0.05, get);
    this._get = get;
  }
  return this._ci;
};

prototype$9.ci0 = function(get) {
  return this.ci(get)[0];
};

prototype$9.ci1 = function(get) {
  return this.ci(get)[1];
};

/**
 * Group-by aggregation operator.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {Array<function(object): *>} [params.groupby] - An array of accessors to groupby.
 * @param {Array<function(object): *>} [params.fields] - An array of accessors to aggregate.
 * @param {Array<string>} [params.ops] - An array of strings indicating aggregation operations.
 * @param {Array<string>} [params.as] - An array of output field names for aggregated values.
 * @param {boolean} [params.cross=false] - A flag indicating that the full
 *   cross-product of groupby values should be generated, including empty cells.
 *   If true, the drop parameter is ignored and empty cells are retained.
 * @param {boolean} [params.drop=true] - A flag indicating if empty cells should be removed.
 */
function Aggregate(params) {
  Transform.call(this, null, params);

  this._adds = []; // array of added output tuples
  this._mods = []; // array of modified output tuples
  this._alen = 0;  // number of active added tuples
  this._mlen = 0;  // number of active modified tuples
  this._drop = true;   // should empty aggregation cells be removed
  this._cross = false; // produce full cross-product of group-by values

  this._dims = [];   // group-by dimension accessors
  this._dnames = []; // group-by dimension names

  this._measures = []; // collection of aggregation monoids
  this._countOnly = false; // flag indicating only count aggregation
  this._counts = null; // collection of count fields
  this._prev = null;   // previous aggregation cells

  this._inputs = null;  // array of dependent input tuple field names
  this._outputs = null; // array of output tuple field names
}

Aggregate.Definition = {
  "type": "Aggregate",
  "metadata": {"generates": true, "changes": true},
  "params": [
    { "name": "groupby", "type": "field", "array": true },
    { "name": "ops", "type": "enum", "array": true, "values": ValidAggregateOps },
    { "name": "fields", "type": "field", "null": true, "array": true },
    { "name": "as", "type": "string", "null": true, "array": true },
    { "name": "drop", "type": "boolean", "default": true },
    { "name": "cross", "type": "boolean", "default": false },
    { "name": "key", "type": "field" }
  ]
};

var prototype$8 = inherits(Aggregate, Transform);

prototype$8.transform = function(_, pulse) {
  var aggr = this,
      out = pulse.fork(pulse.NO_SOURCE | pulse.NO_FIELDS),
      mod;

  this.stamp = out.stamp;

  if (this.value && ((mod = _.modified()) || pulse.modified(this._inputs))) {
    this._prev = this.value;
    this.value = mod ? this.init(_) : {};
    pulse.visit(pulse.SOURCE, function(t) { aggr.add(t); });
  } else {
    this.value = this.value || this.init(_);
    pulse.visit(pulse.REM, function(t) { aggr.rem(t); });
    pulse.visit(pulse.ADD, function(t) { aggr.add(t); });
  }

  // Indicate output fields and return aggregate tuples.
  out.modifies(this._outputs);

  // Should empty cells be dropped?
  aggr._drop = _.drop !== false;

  // If domain cross-product requested, generate empty cells as needed
  // and ensure that empty cells are not dropped
  if (_.cross && aggr._dims.length > 1) {
    aggr._drop = false;
    this.cross();
  }

  return aggr.changes(out);
};

prototype$8.cross = function() {
  var aggr = this,
      curr = aggr.value,
      dims = aggr._dnames,
      vals = dims.map(function() { return {}; }),
      n = dims.length;

  // collect all group-by domain values
  function collect(cells) {
    var key, i, t, v;
    for (key in cells) {
      t = cells[key].tuple;
      for (i=0; i<n; ++i) {
        vals[i][(v = t[dims[i]])] = v;
      }
    }
  }
  collect(aggr._prev);
  collect(curr);

  // iterate over key cross-product, create cells as needed
  function generate(base, tuple, index) {
    var name = dims[index],
        v = vals[index++],
        k, key;

    for (k in v) {
      tuple[name] = v[k];
      key = base ? base + '|' + k : k;
      if (index < n) generate(key, tuple, index);
      else if (!curr[key]) aggr.cell(key, tuple);
    }
  }
  generate('', {}, 0);
};

prototype$8.init = function(_) {
  // initialize input and output fields
  var inputs = (this._inputs = []),
      outputs = (this._outputs = []),
      inputMap = {};

  function inputVisit(get) {
    var fields = array(accessorFields(get)),
        i = 0, n = fields.length, f;
    for (; i<n; ++i) {
      if (!inputMap[f=fields[i]]) {
        inputMap[f] = 1;
        inputs.push(f);
      }
    }
  }

  // initialize group-by dimensions
  this._dims = array(_.groupby);
  this._dnames = this._dims.map(function(d) {
    var dname = accessorName(d);
    inputVisit(d);
    outputs.push(dname);
    return dname;
  });
  this.cellkey = _.key ? _.key : groupkey(this._dims);

  // initialize aggregate measures
  this._countOnly = true;
  this._counts = [];
  this._measures = [];

  var fields = _.fields || [null],
      ops = _.ops || ['count'],
      as = _.as || [],
      n = fields.length,
      map = {},
      field, op, m, mname, outname, i;

  if (n !== ops.length) {
    error('Unmatched number of fields and aggregate ops.');
  }

  for (i=0; i<n; ++i) {
    field = fields[i];
    op = ops[i];

    if (field == null && op !== 'count') {
      error('Null aggregate field specified.');
    }
    mname = accessorName(field);
    outname = measureName(op, mname, as[i]);
    outputs.push(outname);

    if (op === 'count') {
      this._counts.push(outname);
      continue;
    }

    m = map[mname];
    if (!m) {
      inputVisit(field);
      m = (map[mname] = []);
      m.field = field;
      this._measures.push(m);
    }

    if (op !== 'count') this._countOnly = false;
    m.push(createMeasure(op, outname));
  }

  this._measures = this._measures.map(function(m) {
    return compileMeasures(m, m.field);
  });

  return {}; // aggregation cells (this.value)
};

// -- Cell Management -----

prototype$8.cellkey = groupkey();

prototype$8.cell = function(key, t) {
  var cell = this.value[key];
  if (!cell) {
    cell = this.value[key] = this.newcell(key, t);
    this._adds[this._alen++] = cell;
  } else if (cell.num === 0 && this._drop && cell.stamp < this.stamp) {
    cell.stamp = this.stamp;
    this._adds[this._alen++] = cell;
  } else if (cell.stamp < this.stamp) {
    cell.stamp = this.stamp;
    this._mods[this._mlen++] = cell;
  }
  return cell;
};

prototype$8.newcell = function(key, t) {
  var cell = {
    key:   key,
    num:   0,
    agg:   null,
    tuple: this.newtuple(t, this._prev && this._prev[key]),
    stamp: this.stamp,
    store: false
  };

  if (!this._countOnly) {
    var measures = this._measures,
        n = measures.length, i;

    cell.agg = Array(n);
    for (i=0; i<n; ++i) {
      cell.agg[i] = new measures[i](cell);
    }
  }

  if (cell.store) {
    cell.data = new TupleStore();
  }

  return cell;
};

prototype$8.newtuple = function(t, p) {
  var names = this._dnames,
      dims = this._dims,
      x = {}, i, n;

  for (i=0, n=dims.length; i<n; ++i) {
    x[names[i]] = dims[i](t);
  }

  return p ? replace(p.tuple, x) : ingest(x);
};

// -- Process Tuples -----

prototype$8.add = function(t) {
  var key = this.cellkey(t),
      cell = this.cell(key, t),
      agg, i, n;

  cell.num += 1;
  if (this._countOnly) return;

  if (cell.store) cell.data.add(t);

  agg = cell.agg;
  for (i=0, n=agg.length; i<n; ++i) {
    agg[i].add(agg[i].get(t), t);
  }
};

prototype$8.rem = function(t) {
  var key = this.cellkey(t),
      cell = this.cell(key, t),
      agg, i, n;

  cell.num -= 1;
  if (this._countOnly) return;

  if (cell.store) cell.data.rem(t);

  agg = cell.agg;
  for (i=0, n=agg.length; i<n; ++i) {
    agg[i].rem(agg[i].get(t), t);
  }
};

prototype$8.celltuple = function(cell) {
  var tuple = cell.tuple,
      counts = this._counts,
      agg, i, n;

  // consolidate stored values
  if (cell.store) {
    cell.data.values();
  }

  // update tuple properties
  for (i=0, n=counts.length; i<n; ++i) {
    tuple[counts[i]] = cell.num;
  }
  if (!this._countOnly) {
    agg = cell.agg;
    for (i=0, n=agg.length; i<n; ++i) {
      agg[i].set(tuple);
    }
  }

  return tuple;
};

prototype$8.changes = function(out) {
  var adds = this._adds,
      mods = this._mods,
      prev = this._prev,
      drop = this._drop,
      add = out.add,
      rem = out.rem,
      mod = out.mod,
      cell, key, i, n;

  if (prev) for (key in prev) {
    cell = prev[key];
    if (!drop || cell.num) rem.push(cell.tuple);
  }

  for (i=0, n=this._alen; i<n; ++i) {
    add.push(this.celltuple(adds[i]));
    adds[i] = null; // for garbage collection
  }

  for (i=0, n=this._mlen; i<n; ++i) {
    cell = mods[i];
    (cell.num === 0 && drop ? rem : mod).push(this.celltuple(cell));
    mods[i] = null; // for garbage collection
  }

  this._alen = this._mlen = 0; // reset list of active cells
  this._prev = null;
  return out;
};

/**
 * Generates a binning function for discretizing data.
 * @constructor
 * @param {object} params - The parameters for this operator. The
 *   provided values should be valid options for the {@link bin} function.
 * @param {function(object): *} params.field - The data field to bin.
 */
function Bin(params) {
  Transform.call(this, null, params);
}

Bin.Definition = {
  "type": "Bin",
  "metadata": {"modifies": true},
  "params": [
    { "name": "field", "type": "field", "required": true },
    { "name": "anchor", "type": "number" },
    { "name": "maxbins", "type": "number", "default": 20 },
    { "name": "base", "type": "number", "default": 10 },
    { "name": "divide", "type": "number", "array": true, "default": [5, 2] },
    { "name": "extent", "type": "number", "array": true, "length": 2, "required": true },
    { "name": "step", "type": "number" },
    { "name": "steps", "type": "number", "array": true },
    { "name": "minstep", "type": "number", "default": 0 },
    { "name": "nice", "type": "boolean", "default": true },
    { "name": "name", "type": "string" },
    { "name": "as", "type": "string", "array": true, "length": 2, "default": ["bin0", "bin1"] }
  ]
};

var prototype$10 = inherits(Bin, Transform);

prototype$10.transform = function(_, pulse) {
  var bins = this._bins(_),
      start = bins.start,
      step = bins.step,
      as = _.as || ['bin0', 'bin1'],
      b0 = as[0],
      b1 = as[1],
      flag;

  if (_.modified()) {
    pulse = pulse.reflow(true);
    flag = pulse.SOURCE;
  } else {
    flag = pulse.modified(accessorFields(_.field)) ? pulse.ADD_MOD : pulse.ADD;
  }

  pulse.visit(flag, function(t) {
    var v = bins(t);
    // minimum bin value (inclusive)
    t[b0] = v;
    // maximum bin value (exclusive)
    // use convoluted math for better floating point agreement
    // see https://github.com/vega/vega/issues/830
    t[b1] = v == null ? null : start + step * (1 + (v - start) / step);
  });

  return pulse.modifies(as);
};

prototype$10._bins = function(_) {
  if (this.value && !_.modified()) {
    return this.value;
  }

  var field = _.field,
      bins  = bin(_),
      start = bins.start,
      stop  = bins.stop,
      step  = bins.step,
      a, d;

  if ((a = _.anchor) != null) {
    d = a - (start + step * Math.floor((a - start) / step));
    start += d;
    stop += d;
  }

  var f = function(t) {
    var v = field(t);
    if (v == null) {
      return null;
    } else {
      v = Math.max(start, Math.min(+v, stop - step));
      return start + step * Math.floor((v - start) / step);
    }
  };

  f.start = start;
  f.stop = stop;
  f.step = step;

  return this.value = accessor(
    f,
    accessorFields(field),
    _.name || 'bin_' + accessorName(field)
  );
};

var SortedList = function(idFunc, source, input) {
  var $ = idFunc,
      data = source || [],
      add = input || [],
      rem = {},
      cnt = 0;

  return {
    add: function(t) { add.push(t); },
    remove: function(t) { rem[$(t)] = ++cnt; },
    size: function() { return data.length; },
    data: function(compare, resort) {
      if (cnt) {
        data = data.filter(function(t) { return !rem[$(t)]; });
        rem = {};
        cnt = 0;
      }
      if (resort && compare) {
        data.sort(compare);
      }
      if (add.length) {
        data = compare
          ? merge(compare, data, add.sort(compare))
          : data.concat(add);
        add = [];
      }
      return data;
    }
  }
};

/**
 * Collects all data tuples that pass through this operator.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {function(*,*): number} [params.sort] - An optional
 *   comparator function for additionally sorting the collected tuples.
 */
function Collect(params) {
  Transform.call(this, [], params);
}

Collect.Definition = {
  "type": "Collect",
  "metadata": {"source": true},
  "params": [
    { "name": "sort", "type": "compare" }
  ]
};

var prototype$11 = inherits(Collect, Transform);

prototype$11.transform = function(_, pulse) {
  var out = pulse.fork(pulse.ALL),
      list = SortedList(tupleid, this.value, out.materialize(out.ADD).add),
      sort = _.sort,
      mod = pulse.changed() || (sort &&
            (_.modified('sort') || pulse.modified(sort.fields)));

  out.visit(out.REM, list.remove);

  this.modified(mod);
  this.value = out.source = list.data(sort, mod);
  return out;
};

/**
 * Generates a comparator function.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {Array<string>} params.fields - The fields to compare.
 * @param {Array<string>} [params.orders] - The sort orders.
 *   Each entry should be one of "ascending" (default) or "descending".
 */
function Compare(params) {
  Operator.call(this, null, update$1, params);
}

inherits(Compare, Operator);

function update$1(_) {
  return (this.value && !_.modified())
    ? this.value
    : compare(_.fields, _.orders);
}

/**
 * Count regexp-defined pattern occurrences in a text field.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {function(object): *} params.field - An accessor for the text field.
 * @param {string} [params.pattern] - RegExp string defining the text pattern.
 * @param {string} [params.case] - One of 'lower', 'upper' or null (mixed) case.
 * @param {string} [params.stopwords] - RegExp string of words to ignore.
 */
function CountPattern(params) {
  Transform.call(this, null, params);
}

CountPattern.Definition = {
  "type": "CountPattern",
  "metadata": {"generates": true, "changes": true},
  "params": [
    { "name": "field", "type": "field", "required": true },
    { "name": "case", "type": "enum", "values": ["upper", "lower", "mixed"], "default": "mixed" },
    { "name": "pattern", "type": "string", "default": "[\\w\"]+" },
    { "name": "stopwords", "type": "string", "default": "" },
    { "name": "as", "type": "string", "array": true, "length": 2, "default": ["text", "count"] }
  ]
};

function tokenize(text, tcase, match) {
  switch (tcase) {
    case 'upper': text = text.toUpperCase(); break;
    case 'lower': text = text.toLowerCase(); break;
  }
  return text.match(match);
}

var prototype$12 = inherits(CountPattern, Transform);

prototype$12.transform = function(_, pulse) {
  function process(update) {
    return function(tuple) {
      var tokens = tokenize(get(tuple), _.case, match) || [], t;
      for (var i=0, n=tokens.length; i<n; ++i) {
        if (!stop.test(t = tokens[i])) update(t);
      }
    };
  }

  var init = this._parameterCheck(_, pulse),
      counts = this._counts,
      match = this._match,
      stop = this._stop,
      get = _.field,
      as = _.as || ['text', 'count'],
      add = process(function(t) { counts[t] = 1 + (counts[t] || 0); }),
      rem = process(function(t) { counts[t] -= 1; });

  if (init) {
    pulse.visit(pulse.SOURCE, add);
  } else {
    pulse.visit(pulse.ADD, add);
    pulse.visit(pulse.REM, rem);
  }

  return this._finish(pulse, as); // generate output tuples
};

prototype$12._parameterCheck = function(_, pulse) {
  var init = false;

  if (_.modified('stopwords') || !this._stop) {
    this._stop = new RegExp('^' + (_.stopwords || '') + '$', 'i');
    init = true;
  }

  if (_.modified('pattern') || !this._match) {
    this._match = new RegExp((_.pattern || '[\\w\']+'), 'g');
    init = true;
  }

  if (_.modified('field') || pulse.modified(_.field.fields)) {
    init = true;
  }

  if (init) this._counts = {};
  return init;
};

prototype$12._finish = function(pulse, as) {
  var counts = this._counts,
      tuples = this._tuples || (this._tuples = {}),
      text = as[0],
      count = as[1],
      out = pulse.fork(),
      w, t, c;

  for (w in counts) {
    t = tuples[w];
    c = counts[w] || 0;
    if (!t && c) {
      tuples[w] = (t = ingest({}));
      t[text] = w;
      t[count] = c;
      out.add.push(t);
    } else if (c === 0) {
      if (t) out.rem.push(t);
      counts[w] = null;
      tuples[w] = null;
    } else if (t[count] !== c) {
      t[count] = c;
      out.mod.push(t);
    }
  }

  return out.modifies(as);
};

/**
 * Perform a cross-product of a tuple stream with itself.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {function(object):boolean} [params.filter] - An optional filter
 *   function for selectively including tuples in the cross product.
 * @param {Array<string>} [params.as] - The names of the output fields.
 */
function Cross(params) {
  Transform.call(this, null, params);
}

Cross.Definition = {
  "type": "Cross",
  "metadata": {"source": true, "generates": true, "changes": true},
  "params": [
    { "name": "filter", "type": "expr" },
    { "name": "as", "type": "string", "array": true, "length": 2, "default": ["a", "b"] }
  ]
};

var prototype$13 = inherits(Cross, Transform);

prototype$13.transform = function(_, pulse) {
  var out = pulse.fork(pulse.NO_SOURCE),
      data = this.value,
      as = _.as || ['a', 'b'],
      a = as[0], b = as[1],
      reset = !data
          || pulse.changed(pulse.ADD_REM)
          || _.modified('as')
          || _.modified('filter');

  if (reset) {
    if (data) out.rem = data;
    out.add = this.value = cross$1(pulse.source, a, b, _.filter || truthy);
  } else {
    out.mod = data;
  }

  out.source = this.value;
  return out.modifies(as);
};

function cross$1(input, a, b, filter) {
  var data = [],
      t = {},
      n = input.length,
      i = 0,
      j, left;

  for (; i<n; ++i) {
    t[a] = left = input[i];
    for (j=0; j<n; ++j) {
      t[b] = input[j];
      if (filter(t)) {
        data.push(ingest(t));
        t = {};
        t[a] = left;
      }
    }
  }

  return data;
}

var Distributions = {
  kde:     randomKDE,
  mixture: randomMixture,
  normal:  randomNormal,
  uniform: randomUniform
};

var DISTRIBUTIONS = 'distributions';
var FUNCTION = 'function';
var FIELD = 'field';

/**
 * Parse a parameter object for a probability distribution.
 * @param {object} def - The distribution parameter object.
 * @param {function():Array<object>} - A method for requesting
 *   source data. Used for distributions (such as KDE) that
 *   require sample data points. This method will only be
 *   invoked if the 'from' parameter for a target data source
 *   is not provided. Typically this method returns backing
 *   source data for a Pulse object.
 * @return {object} - The output distribution object.
 */
function parse(def, data) {
  var func = def[FUNCTION];
  if (!Distributions.hasOwnProperty(func)) {
    error('Unknown distribution function: ' + func);
  }

  var d = Distributions[func]();

  for (var name in def) {
    // if data field, extract values
    if (name === FIELD) {
      d.data((def.from || data()).map(def[name]));
    }

    // if distribution mixture, recurse to parse each definition
    else if (name === DISTRIBUTIONS) {
      d[name](def[name].map(function(_) { return parse(_, data); }));
    }

    // otherwise, simply set the parameter
    else if (typeof d[name] === FUNCTION) {
      d[name](def[name]);
    }
  }

  return d;
}

/**
 * Grid sample points for a probability density. Given a distribution and
 * a sampling extent, will generate points suitable for plotting either
 * PDF (probability density function) or CDF (cumulative distribution
 * function) curves.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {object} params.distribution - The probability distribution. This
 *   is an object parameter dependent on the distribution type.
 * @param {string} [params.method='pdf'] - The distribution method to sample.
 *   One of 'pdf' or 'cdf'.
 * @param {Array<number>} [params.extent] - The [min, max] extent over which
 *   to sample the distribution. This argument is required in most cases, but
 *   can be omitted if the distribution (e.g., 'kde') supports a 'data' method
 *   that returns numerical sample points from which the extent can be deduced.
 * @param {number} [params.steps=100] - The number of sampling steps.
 */
function Density(params) {
  Transform.call(this, null, params);
}

var distributions = [
  {
    "key": {"function": "normal"},
    "params": [
      { "name": "mean", "type": "number", "default": 0 },
      { "name": "stdev", "type": "number", "default": 1 }
    ]
  },
  {
    "key": {"function": "uniform"},
    "params": [
      { "name": "min", "type": "number", "default": 0 },
      { "name": "max", "type": "number", "default": 1 }
    ]
  },
  {
    "key": {"function": "kde"},
    "params": [
      { "name": "field", "type": "field", "required": true },
      { "name": "from", "type": "data" },
      { "name": "bandwidth", "type": "number", "default": 0 }
    ]
  }
];

var mixture = {
  "key": {"function": "mixture"},
  "params": [
    { "name": "distributions", "type": "param", "array": true,
      "params": distributions },
    { "name": "weights", "type": "number", "array": true }
  ]
};

Density.Definition = {
  "type": "Density",
  "metadata": {"generates": true, "source": true},
  "params": [
    { "name": "extent", "type": "number", "array": true, "length": 2 },
    { "name": "steps", "type": "number", "default": 100 },
    { "name": "method", "type": "string", "default": "pdf",
      "values": ["pdf", "cdf"] },
    { "name": "distribution", "type": "param",
      "params": distributions.concat(mixture) },
    { "name": "as", "type": "string", "array": true,
      "default": ["value", "density"] }
  ]
};

var prototype$14 = inherits(Density, Transform);

prototype$14.transform = function(_, pulse) {
  var out = pulse.fork(pulse.NO_SOURCE | pulse.NO_FIELDS);

  if (!this.value || pulse.changed() || _.modified()) {
    var dist = parse(_.distribution, source(pulse)),
        method = _.method || 'pdf';

    if (method !== 'pdf' && method !== 'cdf') {
      error('Invalid density method: ' + method);
    }
    if (!_.extent && !dist.data) {
      error('Missing density extent parameter.');
    }
    method = dist[method];

    var as = _.as || ['value', 'density'],
        domain = _.extent || extent(dist.data()),
        step = (domain[1] - domain[0]) / (_.steps || 100),
        values = range(domain[0], domain[1] + step/2, step)
          .map(function(v) {
            var tuple = {};
            tuple[as[0]] = v;
            tuple[as[1]] = method(v);
            return ingest(tuple);
          });

    if (this.value) out.rem = this.value;
    this.value = out.add = out.source = values;
  }

  return out;
};

function source(pulse) {
  return function() { return pulse.materialize(pulse.SOURCE).source; };
}

/**
 * Computes extents (min/max) for a data field.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {function(object): *} params.field - The field over which to compute extends.
 */
function Extent(params) {
  Transform.call(this, [+Infinity, -Infinity], params);
}

Extent.Definition = {
  "type": "Extent",
  "metadata": {},
  "params": [
    { "name": "field", "type": "field", "required": true }
  ]
};

var prototype$15 = inherits(Extent, Transform);

prototype$15.transform = function(_, pulse) {
  var extent = this.value,
      field = _.field,
      min = extent[0],
      max = extent[1],
      flag = pulse.ADD,
      mod;

  mod = pulse.changed()
     || pulse.modified(field.fields)
     || _.modified('field');

  if (mod) {
    flag = pulse.SOURCE;
    min = +Infinity;
    max = -Infinity;
  }

  pulse.visit(flag, function(t) {
    var v = field(t);
    if (v != null) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
  });

  this.value = [min, max];
};

/**
 * Provides a bridge between a parent transform and a target subflow that
 * consumes only a subset of the tuples that pass through the parent.
 * @constructor
 * @param {Pulse} pulse - A pulse to use as the value of this operator.
 * @param {Transform} parent - The parent transform (typically a Facet instance).
 * @param {Transform} target - A transform that receives the subflow of tuples.
 */
function Subflow(pulse, parent) {
  Operator.call(this, pulse);
  this.parent = parent;
}

var prototype$17 = inherits(Subflow, Operator);

prototype$17.connect = function(target) {
  this.targets().add(target);
  return (target.source = this);
};

/**
 * Add an 'add' tuple to the subflow pulse.
 * @param {Tuple} t - The tuple being added.
 */
prototype$17.add = function(t) {
  this.value.add.push(t);
};

/**
 * Add a 'rem' tuple to the subflow pulse.
 * @param {Tuple} t - The tuple being removed.
 */
prototype$17.rem = function(t) {
  this.value.rem.push(t);
};

/**
 * Add a 'mod' tuple to the subflow pulse.
 * @param {Tuple} t - The tuple being modified.
 */
prototype$17.mod = function(t) {
  this.value.mod.push(t);
};

/**
 * Re-initialize this operator's pulse value.
 * @param {Pulse} pulse - The pulse to copy from.
 * @see Pulse.init
 */
prototype$17.init = function(pulse) {
  this.value.init(pulse, pulse.NO_SOURCE);
};

/**
 * Evaluate this operator. This method overrides the
 * default behavior to simply return the contained pulse value.
 * @return {Pulse}
 */
prototype$17.evaluate = function() {
  // assert: this.value.stamp === pulse.stamp
  return this.value;
};

/**
 * Facets a dataflow into a set of subflows based on a key.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {function(Dataflow, string): Operator} params.subflow - A function
 *   that generates a subflow of operators and returns its root operator.
 * @param {function(object): *} params.key - The key field to facet by.
 */
function Facet(params) {
  Transform.call(this, {}, params);
  this._keys = fastmap(); // cache previously calculated key values

  // keep track of active subflows, use as targets array for listeners
  // this allows us to limit propagation to only updated subflows
  var a = this._targets = [];
  a.active = 0;
  a.forEach = function(f) {
    for (var i=0, n=a.active; i<n; ++i) f(a[i], i, a);
  };
}

var prototype$16 = inherits(Facet, Transform);

prototype$16.activate = function(flow) {
  this._targets[this._targets.active++] = flow;
};

prototype$16.subflow = function(key, flow, pulse, parent) {
  var flows = this.value,
      sf = flows.hasOwnProperty(key) && flows[key],
      df, p;

  if (!sf) {
    p = parent || (p = this._group[key]) && p.tuple;
    df = pulse.dataflow;
    sf = df.add(new Subflow(pulse.fork(pulse.NO_SOURCE), this))
      .connect(flow(df, key, p));
    flows[key] = sf;
    this.activate(sf);
  } else if (sf.value.stamp < pulse.stamp) {
    sf.init(pulse);
    this.activate(sf);
  }

  return sf;
};

prototype$16.transform = function(_, pulse) {
  var df = pulse.dataflow,
      self = this,
      key = _.key,
      flow = _.subflow,
      cache = this._keys,
      rekey = _.modified('key');

  function subflow(key) {
    return self.subflow(key, flow, pulse);
  }

  this._group = _.group || {};
  this._targets.active = 0; // reset list of active subflows

  pulse.visit(pulse.REM, function(t) {
    var id = tupleid(t),
        k = cache.get(id);
    if (k !== undefined) {
      cache.delete(id);
      subflow(k).rem(t);
    }
  });

  pulse.visit(pulse.ADD, function(t) {
    var k = key(t);
    cache.set(tupleid(t), k);
    subflow(k).add(t);
  });

  if (rekey || pulse.modified(key.fields)) {
    pulse.visit(pulse.MOD, function(t) {
      var id = tupleid(t),
          k0 = cache.get(id),
          k1 = key(t);
      if (k0 === k1) {
        subflow(k1).mod(t);
      } else {
        cache.set(id, k1);
        subflow(k0).rem(t);
        subflow(k1).add(t);
      }
    });
  } else if (pulse.changed(pulse.MOD)) {
    pulse.visit(pulse.MOD, function(t) {
      subflow(cache.get(tupleid(t))).mod(t);
    });
  }

  if (rekey) {
    pulse.visit(pulse.REFLOW, function(t) {
      var id = tupleid(t),
          k0 = cache.get(id),
          k1 = key(t);
      if (k0 !== k1) {
        cache.set(id, k1);
        subflow(k0).rem(t);
        subflow(k1).add(t);
      }
    });
  }

  if (cache.empty > df.cleanThreshold) df.runAfter(cache.clean);
  return pulse;
};

/**
 * Generates one or more field accessor functions.
 * If the 'name' parameter is an array, an array of field accessors
 * will be created and the 'as' parameter will be ignored.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {string} params.name - The field name(s) to access.
 * @param {string} params.as - The accessor function name.
 */
function Field(params) {
  Operator.call(this, null, update$2, params);
}

inherits(Field, Operator);

function update$2(_) {
  return (this.value && !_.modified()) ? this.value
    : isArray(_.name) ? array(_.name).map(function(f) { return field(f); })
    : field(_.name, _.as);
}

/**
 * Filters data tuples according to a predicate function.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {function(object): *} params.expr - The predicate expression function
 *   that determines a tuple's filter status. Truthy values pass the filter.
 */
function Filter(params) {
  Transform.call(this, fastmap(), params);
}

Filter.Definition = {
  "type": "Filter",
  "metadata": {"changes": true},
  "params": [
    { "name": "expr", "type": "expr", "required": true }
  ]
};

var prototype$18 = inherits(Filter, Transform);

prototype$18.transform = function(_, pulse) {
  var df = pulse.dataflow,
      cache = this.value, // cache ids of filtered tuples
      output = pulse.fork(),
      add = output.add,
      rem = output.rem,
      mod = output.mod,
      test = _.expr,
      isMod = true;

  pulse.visit(pulse.REM, function(t) {
    var id = tupleid(t);
    if (!cache.has(id)) rem.push(t);
    else cache.delete(id);
  });

  pulse.visit(pulse.ADD, function(t) {
    if (test(t, _)) add.push(t);
    else cache.set(tupleid(t), 1);
  });

  function revisit(t) {
    var id = tupleid(t),
        b = test(t, _),
        s = cache.get(id);
    if (b && s) {
      cache.delete(id);
      add.push(t);
    } else if (!b && !s) {
      cache.set(id, 1);
      rem.push(t);
    } else if (isMod && b && !s) {
      mod.push(t);
    }
  }

  pulse.visit(pulse.MOD, revisit);

  if (_.modified()) {
    isMod = false;
    pulse.visit(pulse.REFLOW, revisit);
  }

  if (cache.empty > df.cleanThreshold) df.runAfter(cache.clean);
  return output;
};

/**
 * Folds one more tuple fields into multiple tuples in which the field
 * name and values are available under new 'key' and 'value' fields.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {function(object): *} params.fields - An array of field accessors
 *   for the tuple fields that should be folded.
 */
function Fold(params) {
  Transform.call(this, {}, params);
}

Fold.Definition = {
  "type": "Fold",
  "metadata": {"generates": true, "changes": true},
  "params": [
    { "name": "fields", "type": "field", "array": true, "required": true },
    { "name": "as", "type": "string", "array": true, "length": 2, "default": ["key", "value"] }
  ]
};

var prototype$19 = inherits(Fold, Transform);

function keyFunction(f) {
  return f.fields.join('|');
}

prototype$19.transform = function(_, pulse) {
  var cache = this.value,
      reset = _.modified('fields'),
      fields = _.fields,
      as = _.as || ['key', 'value'],
      key = as[0],
      value = as[1],
      keys = fields.map(keyFunction),
      n = fields.length,
      stamp = pulse.stamp,
      out = pulse.fork(pulse.NO_SOURCE),
      i = 0, mask = 0, id;

  function add(t) {
    var f = (cache[tupleid(t)] = Array(n)); // create cache of folded tuples
    for (var i=0, ft; i<n; ++i) { // for each key, derive folds
      ft = (f[i] = derive(t));
      ft[key] = keys[i];
      ft[value] = fields[i](t);
      out.add.push(ft);
    }
  }

  function mod(t) {
    var f = cache[tupleid(t)]; // get cache of folded tuples
    for (var i=0, ft; i<n; ++i) { // for each key, rederive folds
      if (!(mask & (1 << i))) continue; // field is unchanged
      ft = rederive(t, f[i], stamp);
      ft[key] = keys[i];
      ft[value] = fields[i](t);
      out.mod.push(ft);
    }
  }

  if (reset) {
    // on reset, remove all folded tuples and clear cache
    for (id in cache) out.rem.push.apply(out.rem, cache[id]);
    cache = this.value = {};
    pulse.visit(pulse.SOURCE, add);
  } else {
    pulse.visit(pulse.ADD, add);

    for (; i<n; ++i) {
      if (pulse.modified(fields[i].fields)) mask |= (1 << i);
    }
    if (mask) pulse.visit(pulse.MOD, mod);

    pulse.visit(pulse.REM, function(t) {
      var id = tupleid(t);
      out.rem.push.apply(out.rem, cache[id]);
      cache[id] = null;
    });
  }

  return out.modifies(as);
};

/**
 * Invokes a function for each data tuple and saves the results as a new field.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {function(object): *} params.expr - The formula function to invoke for each tuple.
 * @param {string} params.as - The field name under which to save the result.
 * @param {boolean} [params.initonly=false] - If true, the formula is applied to
 *   added tuples only, and does not update in response to modifications.
 */
function Formula(params) {
  Transform.call(this, null, params);
}

Formula.Definition = {
  "type": "Formula",
  "metadata": {"modifies": true},
  "params": [
    { "name": "expr", "type": "expr", "required": true },
    { "name": "as", "type": "string", "required": true },
    { "name": "initonly", "type": "boolean" }
  ]
};

var prototype$20 = inherits(Formula, Transform);

prototype$20.transform = function(_, pulse) {
  var func = _.expr,
      as = _.as,
      mod = _.modified(),
      flag = _.initonly ? pulse.ADD
        : mod ? pulse.SOURCE
        : pulse.modified(func.fields) ? pulse.ADD_MOD
        : pulse.ADD;

  function set(t) {
    t[as] = func(t, _);
  }

  if (mod) {
    // parameters updated, need to reflow
    pulse = pulse.materialize().reflow(true);
  }

  if (!_.initonly) {
    pulse.modifies(as);
  }

  return pulse.visit(flag, set);
};

/**
 * Generates data tuples using a provided generator function.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {function(Parameters): object} params.generator - A tuple generator
 *   function. This function is given the operator parameters as input.
 *   Changes to any additional parameters will not trigger re-calculation
 *   of previously generated tuples. Only future tuples are affected.
 * @param {number} params.size - The number of tuples to produce.
 */
function Generate(params) {
  Transform.call(this, [], params);
}

var prototype$21 = inherits(Generate, Transform);

prototype$21.transform = function(_, pulse) {
  var data = this.value,
      out = pulse.fork(pulse.ALL),
      num = _.size - data.length,
      gen = _.generator,
      add, rem, t;

  if (num > 0) {
    // need more tuples, generate and add
    for (add=[]; --num >= 0;) {
      add.push(t = ingest(gen(_)));
      data.push(t);
    }
    out.add = out.add.length
      ? out.materialize(out.ADD).add.concat(add)
      : add;
  } else {
    // need fewer tuples, remove
    rem = data.slice(0, -num);
    out.rem = out.rem.length
      ? out.materialize(out.REM).rem.concat(rem)
      : rem;
    data = data.slice(-num);
  }

  out.source = this.value = data;
  return out;
};

var Methods = {
  value: 'value',
  median: median,
  mean: mean,
  min: min,
  max: max
};

var Empty = [];

/**
 * Impute missing values.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {function(object): *} params.field - The value field to impute.
 * @param {Array<function(object): *>} [params.groupby] - An array of
 *   accessors to determine series within which to perform imputation.
 * @param {function(object): *} params.key - An accessor for a key value.
 *   Each key value should be unique within a group. New tuples will be
 *   imputed for any key values that are not found within a group.
 * @param {Array<*>} [params.keyvals] - Optional array of required key
 *   values. New tuples will be imputed for any key values that are not
 *   found within a group. In addition, these values will be automatically
 *   augmented with the key values observed in the input data.
 * @param {string} [method='value'] - The imputation method to use. One of
 *   'value', 'mean', 'median', 'max', 'min'.
 * @param {*} [value=0] - The constant value to use for imputation
 *   when using method 'value'.
 */
function Impute(params) {
  Transform.call(this, [], params);
}

Impute.Definition = {
  "type": "Impute",
  "metadata": {"changes": true},
  "params": [
    { "name": "field", "type": "field", "required": true },
    { "name": "key", "type": "field", "required": true },
    { "name": "keyvals", "array": true },
    { "name": "groupby", "type": "field", "array": true },
    { "name": "method", "type": "enum", "default": "value",
      "values": ["value", "mean", "median", "max", "min"] },
    { "name": "value", "default": 0 }
  ]
};

var prototype$22 = inherits(Impute, Transform);

function getValue(_) {
  var m = _.method || Methods.value, v;

  if (Methods[m] == null) {
    error('Unrecognized imputation method: ' + m);
  } else if (m === Methods.value) {
    v = _.value !== undefined ? _.value : 0;
    return function() { return v; };
  } else {
    return Methods[m];
  }
}

function getField(_) {
  var f = _.field;
  return function(t) { return t ? f(t) : NaN; };
}

prototype$22.transform = function(_, pulse) {
  var out = pulse.fork(pulse.ALL),
      impute = getValue(_),
      field = getField(_),
      fName = accessorName(_.field),
      kName = accessorName(_.key),
      gNames = (_.groupby || []).map(accessorName),
      groups = partition(pulse.source, _.groupby, _.key, _.keyvals),
      curr = [],
      prev = this.value,
      m = groups.domain.length,
      group, value, gVals, kVal, g, i, j, l, n, t;

  for (g=0, l=groups.length; g<l; ++g) {
    group = groups[g];
    gVals = group.values;
    value = NaN;

    // add tuples for missing values
    for (j=0; j<m; ++j) {
      if (group[j] != null) continue;
      kVal = groups.domain[j];

      t = {_impute: true};
      for (i=0, n=gVals.length; i<n; ++i) t[gNames[i]] = gVals[i];
      t[kName] = kVal;
      t[fName] = isNaN(value) ? (value = impute(group, field)) : value;

      curr.push(ingest(t));
    }
  }

  // update pulse with imputed tuples
  if (curr.length) out.add = out.materialize(out.ADD).add.concat(curr);
  if (prev.length) out.rem = out.materialize(out.REM).rem.concat(prev);
  this.value = curr;

  return out;
};

function partition(data, groupby, key, keyvals) {
  var get = function(f) { return f(t); },
      groups = [],
      domain = keyvals ? keyvals.slice() : [],
      kMap = {},
      gMap = {}, gVals, gKey,
      group, i, j, k, n, t;

  domain.forEach(function(k, i) { kMap[k] = i + 1; });

  for (i=0, n=data.length; i<n; ++i) {
    t = data[i];
    k = key(t);
    j = kMap[k] || (kMap[k] = domain.push(k));

    gKey = (gVals = groupby ? groupby.map(get) : Empty) + '';
    if (!(group = gMap[gKey])) {
      group = (gMap[gKey] = []);
      groups.push(group);
      group.values = gVals;
    }
    group[j-1] = t;
  }

  groups.domain = domain;
  return groups;
}

/**
 * Extend input tuples with aggregate values.
 * Calcuates aggregate values and joins them with the input stream.
 * @constructor
 */
function JoinAggregate(params) {
  Aggregate.call(this, params);
}

JoinAggregate.Definition = {
  "type": "JoinAggregate",
  "metadata": {"modifies": true},
  "params": [
    { "name": "groupby", "type": "field", "array": true },
    { "name": "fields", "type": "field", "null": true, "array": true },
    { "name": "ops", "type": "enum", "array": true, "values": ValidAggregateOps },
    { "name": "as", "type": "string", "null": true, "array": true },
    { "name": "key", "type": "field" }
  ]
};

var prototype$23 = inherits(JoinAggregate, Aggregate);

prototype$23.transform = function(_, pulse) {
  var aggr = this,
      mod = _.modified(),
      cells;

  // process all input tuples to calculate aggregates
  if (aggr.value && (mod || pulse.modified(aggr._inputs))) {
    cells = aggr.value = mod ? aggr.init(_) : {};
    pulse.visit(pulse.SOURCE, function(t) { aggr.add(t); });
  } else {
    cells = aggr.value = aggr.value || this.init(_);
    pulse.visit(pulse.REM, function(t) { aggr.rem(t); });
    pulse.visit(pulse.ADD, function(t) { aggr.add(t); });
  }

  // update aggregation cells
  aggr.changes();

  // write aggregate values to input tuples
  pulse.visit(pulse.SOURCE, function(t) {
    extend(t, cells[aggr.cellkey(t)].tuple);
  });

  return pulse.reflow(mod).modifies(this._outputs);
};

prototype$23.changes = function() {
  var adds = this._adds,
      mods = this._mods,
      i, n;

  for (i=0, n=this._alen; i<n; ++i) {
    this.celltuple(adds[i]);
    adds[i] = null; // for garbage collection
  }

  for (i=0, n=this._mlen; i<n; ++i) {
    this.celltuple(mods[i]);
    mods[i] = null; // for garbage collection
  }

  this._alen = this._mlen = 0; // reset list of active cells
};

/**
 * Generates a key function.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {Array<string>} params.fields - The field name(s) for the key function.
 */
function Key(params) {
  Operator.call(this, null, update$3, params);
}

inherits(Key, Operator);

function update$3(_) {
  return (this.value && !_.modified()) ? this.value : key(_.fields);
}

/**
 * Extend tuples by joining them with values from a lookup table.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {Map} params.index - The lookup table map.
 * @param {Array<function(object): *} params.fields - The fields to lookup.
 * @param {Array<string>} params.as - Output field names for each lookup value.
 * @param {*} [params.default] - A default value to use if lookup fails.
 */
function Lookup(params) {
  Transform.call(this, {}, params);
}

Lookup.Definition = {
  "type": "Lookup",
  "metadata": {"modifies": true},
  "params": [
    { "name": "index", "type": "index", "params": [
        {"name": "from", "type": "data", "required": true },
        {"name": "key", "type": "field", "required": true }
      ] },
    { "name": "values", "type": "field", "array": true },
    { "name": "fields", "type": "field", "array": true, "required": true },
    { "name": "as", "type": "string", "array": true },
    { "name": "default", "default": null }
  ]
};

var prototype$24 = inherits(Lookup, Transform);

prototype$24.transform = function(_, pulse) {
  var out = pulse,
      as = _.as,
      keys = _.fields,
      index = _.index,
      values = _.values,
      defaultValue = _.default==null ? null : _.default,
      reset = _.modified(),
      flag = reset ? pulse.SOURCE : pulse.ADD,
      n = keys.length,
      set, m, mods;

  if (values) {
    m = values.length;

    if (n > 1 && !as) {
      error('Multi-field lookup requires explicit "as" parameter.');
    }
    if (as && as.length !== n * m) {
      error('The "as" parameter has too few output field names.');
    }
    as = as || values.map(accessorName);

    set = function(t) {
      for (var i=0, k=0, j, v; i<n; ++i) {
        v = index.get(keys[i](t));
        if (v == null) for (j=0; j<m; ++j, ++k) t[as[k]] = defaultValue;
        else for (j=0; j<m; ++j, ++k) t[as[k]] = values[j](v);
      }
    };
  } else {
    if (!as) {
      error('Missing output field names.');
    }

    set = function(t) {
      for (var i=0, v; i<n; ++i) {
        v = index.get(keys[i](t));
        t[as[i]] = v==null ? defaultValue : v;
      }
    };
  }

  if (reset) {
    out = pulse.reflow(true);
  } else {
    mods = keys.some(function(k) { return pulse.modified(k.fields); });
    flag |= (mods ? pulse.MOD : 0);
  }
  pulse.visit(flag, set);

  return out.modifies(as);
};

/**
 * Computes global min/max extents over a collection of extents.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {Array<Array<number>>} params.extents - The input extents.
 */
function MultiExtent(params) {
  Operator.call(this, null, update$4, params);
}

inherits(MultiExtent, Operator);

function update$4(_) {
  if (this.value && !_.modified()) {
    return this.value;
  }

  var min = +Infinity,
      max = -Infinity,
      ext = _.extents,
      i, n, e;

  for (i=0, n=ext.length; i<n; ++i) {
    e = ext[i];
    if (e[0] < min) min = e[0];
    if (e[1] > max) max = e[1];
  }
  return [min, max];
}

/**
 * Merge a collection of value arrays.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {Array<Array<*>>} params.values - The input value arrrays.
 */
function MultiValues(params) {
  Operator.call(this, null, update$5, params);
}

inherits(MultiValues, Operator);

function update$5(_) {
  return (this.value && !_.modified())
    ? this.value
    : _.values.reduce(function(data, _) { return data.concat(_); }, []);
}

/**
 * Operator whose value is simply its parameter hash. This operator is
 * useful for enabling reactive updates to values of nested objects.
 * @constructor
 * @param {object} params - The parameters for this operator.
 */
function Params(params) {
  Transform.call(this, null, params);
}

inherits(Params, Transform);

Params.prototype.transform = function(_, pulse) {
  this.modified(_.modified());
  this.value = _;
  return pulse.fork(pulse.NO_SOURCE | pulse.NO_FIELDS); // do not pass tuples
};

/**
 * Partitions pre-faceted data into tuple subflows.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {function(Dataflow, string): Operator} params.subflow - A function
 *   that generates a subflow of operators and returns its root operator.
 * @param {function(object): Array<object>} params.field - The field
 *   accessor for an array of subflow tuple objects.
 */
function PreFacet(params) {
  Facet.call(this, params);
}

var prototype$25 = inherits(PreFacet, Facet);

prototype$25.transform = function(_, pulse) {
  var self = this,
      flow = _.subflow,
      field = _.field;

  if (_.modified('field') || field && pulse.modified(accessorFields(field))) {
    error('PreFacet does not support field modification.');
  }

  this._targets.active = 0; // reset list of active subflows

  pulse.visit(pulse.MOD, function(t) {
    var sf = self.subflow(tupleid(t), flow, pulse, t);
    field ? field(t).forEach(function(_) { sf.mod(_); }) : sf.mod(t);
  });

  pulse.visit(pulse.ADD, function(t) {
    var sf = self.subflow(tupleid(t), flow, pulse, t);
    field ? field(t).forEach(function(_) { sf.add(ingest(_)); }) : sf.add(t);
  });

  pulse.visit(pulse.REM, function(t) {
    var sf = self.subflow(tupleid(t), flow, pulse, t);
    field ? field(t).forEach(function(_) { sf.rem(_); }) : sf.rem(t);
  });

  return pulse;
};

/**
 * Performs a relational projection, copying selected fields from source
 * tuples to a new set of derived tuples.
 * @param {object} params - The parameters for this operator.
 * @param {Array<function(object): *} params.fields - The fields to project,
 *   as an array of field accessors. If unspecified, all fields will be
 *  copied with names unchanged.
 * @param {Array<string>} params.as - Output field names for each projected
 *   field. Any unspecified fields will use the field name provided by
 *   the field accessor.
 * @constructor
 */
function Project(params) {
  Transform.call(this, null, params);
}

Project.Definition = {
  "type": "Project",
  "metadata": {"generates": true, "changes": true, "modifies": true},
  "params": [
    { "name": "fields", "type": "field", "array": true },
    { "name": "as", "type": "string", "null": true, "array": true },
  ]
};

var prototype$26 = inherits(Project, Transform);

prototype$26.transform = function(_, pulse) {
  var fields = _.fields,
      as = output(_.fields, _.as || []),
      derive = fields
        ? function(s, t) { return project(s, t, fields, as); }
        : rederive,
      out, lut;

  if (this.value) {
    lut = this.value;
  } else {
    pulse = pulse.addAll();
    lut = this.value = {};
  }

  out = pulse.fork();

  pulse.visit(pulse.REM, function(t) {
    var id = tupleid(t);
    out.rem.push(lut[id]);
    lut[id] = null;
  });

  pulse.visit(pulse.ADD, function(t) {
    var dt = derive(t, ingest({}));
    lut[tupleid(t)] = dt;
    out.add.push(dt);
  });

  pulse.visit(pulse.MOD, function(t) {
    out.mod.push(derive(t, lut[tupleid(t)]));
  });

  return out;
};

function output(fields, as) {
  if (!fields) return null;
  return fields.map(function(f, i) {
    return as[i] || accessorName(f);
  });
}

function project(s, t, fields, as) {
  for (var i=0, n=fields.length; i<n; ++i) {
    t[as[i]] = fields[i](s);
  }
  return t;
}

/**
 * Proxy the value of another operator as a pure signal value.
 * Ensures no tuples are propagated.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {*} params.value - The value to proxy, becomes the value of this operator.
 */
function Proxy(params) {
  Transform.call(this, null, params);
}

var prototype$27 = inherits(Proxy, Transform);

prototype$27.transform = function(_, pulse) {
  this.value = _.value;
  return _.modified('value')
    ? pulse.fork(pulse.NO_SOURCE | pulse.NO_FIELDS)
    : pulse.StopPropagation;
};

/**
 * Relays a data stream between data processing pipelines.
 * If the derive parameter is set, this transform will create derived
 * copies of observed tuples. This provides derived data streams in which
 * modifications to the tuples do not pollute an upstream data source.
 * @param {object} params - The parameters for this operator.
 * @param {number} [params.derive=false] - Boolean flag indicating if
 *   the transform should make derived copies of incoming tuples.
 * @constructor
 */
function Relay(params) {
  Transform.call(this, null, params);
}

var prototype$28 = inherits(Relay, Transform);

prototype$28.transform = function(_, pulse) {
  var out, lut;

  if (this.value) {
    lut = this.value;
  } else {
    out = pulse = pulse.addAll();
    lut = this.value = {};
  }

  if (_.derive) {
    out = pulse.fork();

    pulse.visit(pulse.REM, function(t) {
      var id = tupleid(t);
      out.rem.push(lut[id]);
      lut[id] = null;
    });

    pulse.visit(pulse.ADD, function(t) {
      var dt = derive(t);
      lut[tupleid(t)] = dt;
      out.add.push(dt);
    });

    pulse.visit(pulse.MOD, function(t) {
      out.mod.push(rederive(t, lut[tupleid(t)]));
    });
  }

  return out;
};

/**
 * Samples tuples passing through this operator.
 * Uses reservoir sampling to maintain a representative sample.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {number} [params.size=1000] - The maximum number of samples.
 */
function Sample(params) {
  Transform.call(this, [], params);
  this.count = 0;
}

Sample.Definition = {
  "type": "Sample",
  "metadata": {"source": true, "changes": true},
  "params": [
    { "name": "size", "type": "number", "default": 1000 }
  ]
};

var prototype$29 = inherits(Sample, Transform);

prototype$29.transform = function(_, pulse) {
  var out = pulse.fork(),
      mod = _.modified('size'),
      num = _.size,
      res = this.value,
      cnt = this.count,
      cap = 0,
      map = res.reduce(function(m, t) {
        m[tupleid(t)] = 1;
        return m;
      }, {});

  // sample reservoir update function
  function update(t) {
    var p, idx;

    if (res.length < num) {
      res.push(t);
    } else {
      idx = ~~((cnt + 1) * random());
      if (idx < res.length && idx >= cap) {
        p = res[idx];
        if (map[tupleid(p)]) out.rem.push(p); // eviction
        res[idx] = t;
      }
    }
    ++cnt;
  }

  if (pulse.rem.length) {
    // find all tuples that should be removed, add to output
    pulse.visit(pulse.REM, function(t) {
      var id = tupleid(t);
      if (map[id]) {
        map[id] = -1;
        out.rem.push(t);
      }
      --cnt;
    });

    // filter removed tuples out of the sample reservoir
    res = res.filter(function(t) { return map[tupleid(t)] !== -1; });
  }

  if ((pulse.rem.length || mod) && res.length < num && pulse.source) {
    // replenish sample if backing data source is available
    cap = cnt = res.length;
    pulse.visit(pulse.SOURCE, function(t) {
      // update, but skip previously sampled tuples
      if (!map[tupleid(t)]) update(t);
    });
    cap = -1;
  }

  if (mod && res.length > num) {
    for (var i=0, n=res.length-num; i<n; ++i) {
      map[tupleid(res[i])] = -1;
      out.rem.push(res[i]);
    }
    res = res.slice(n);
  }

  if (pulse.mod.length) {
    // propagate modified tuples in the sample reservoir
    pulse.visit(pulse.MOD, function(t) {
      if (map[tupleid(t)]) out.mod.push(t);
    });
  }

  if (pulse.add.length) {
    // update sample reservoir
    pulse.visit(pulse.ADD, update);
  }

  if (pulse.add.length || cap < 0) {
    // output newly added tuples
    out.add = res.filter(function(t) { return !map[tupleid(t)]; });
  }

  this.count = cnt;
  this.value = out.source = res;
  return out;
};

/**
 * Generates data tuples for a specified sequence range of numbers.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {number} params.start - The first number in the sequence.
 * @param {number} params.stop - The last number (exclusive) in the sequence.
 * @param {number} [params.step=1] - The step size between numbers in the sequence.
 */
function Sequence(params) {
  Transform.call(this, null, params);
}

Sequence.Definition = {
  "type": "Sequence",
  "metadata": {"generates": true, "source": true},
  "params": [
    { "name": "start", "type": "number", "required": true },
    { "name": "stop", "type": "number", "required": true },
    { "name": "step", "type": "number", "default": 1 }
  ],
  "output": ["value"]
};

var prototype$30 = inherits(Sequence, Transform);

prototype$30.transform = function(_, pulse) {
  if (this.value && !_.modified()) return;

  var out = pulse.materialize().fork(pulse.MOD);

  out.rem = this.value ? pulse.rem.concat(this.value) : pulse.rem;
  out.source = this.value = range(_.start, _.stop, _.step || 1).map(ingest);
  out.add = pulse.add.concat(this.value);
  return out;
};

/**
 * Propagates a new pulse without any tuples so long as the input
 * pulse contains some added, removed or modified tuples.
 * @param {object} params - The parameters for this operator.
 * @constructor
 */
function Sieve(params) {
  Transform.call(this, null, params);
  this.modified(true); // always treat as modified
}

var prototype$31 = inherits(Sieve, Transform);

prototype$31.transform = function(_, pulse) {
  this.value = pulse.source;
  return pulse.changed()
    ? pulse.fork(pulse.NO_SOURCE | pulse.NO_FIELDS)
    : pulse.StopPropagation;
};

/**
 * An index that maps from unique, string-coerced, field values to tuples.
 * Assumes that the field serves as a unique key with no duplicate values.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {function(object): *} params.field - The field accessor to index.
 */
function TupleIndex(params) {
  Transform.call(this, fastmap(), params);
}

var prototype$32 = inherits(TupleIndex, Transform);

prototype$32.transform = function(_, pulse) {
  var df = pulse.dataflow,
      field = _.field,
      index = this.value,
      mod = true;

  function set(t) { index.set(field(t), t); }

  if (_.modified('field') || pulse.modified(field.fields)) {
    index.clear();
    pulse.visit(pulse.SOURCE, set);
  } else if (pulse.changed()) {
    pulse.visit(pulse.REM, function(t) { index.delete(field(t)); });
    pulse.visit(pulse.ADD, set);
  } else {
    mod = false;
  }

  this.modified(mod);
  if (index.empty > df.cleanThreshold) df.runAfter(index.clean);
  return pulse.fork();
};

/**
 * Extracts an array of values. Assumes the source data has already been
 * reduced as needed (e.g., by an upstream Aggregate transform).
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {function(object): *} params.field - The domain field to extract.
 * @param {function(*,*): number} [params.sort] - An optional
 *   comparator function for sorting the values. The comparator will be
 *   applied to backing tuples prior to value extraction.
 */
function Values(params) {
  Transform.call(this, null, params);
}

var prototype$33 = inherits(Values, Transform);

prototype$33.transform = function(_, pulse) {
  var run = !this.value
    || _.modified('field')
    || _.modified('sort')
    || pulse.changed()
    || (_.sort && pulse.modified(_.sort.fields));

  if (run) {
    this.value = (_.sort
      ? pulse.source.slice().sort(_.sort)
      : pulse.source).map(_.field);
  }
};

function WindowOp(op, field, param, as) {
  var fn = WindowOps$1[op](field, param);
  return {
    init:   fn.init || zero,
    update: function(w, t) { t[as] = fn.next(w); }
  };
}

var WindowOps$1 = {
  row_number: function() {
    return {
      next: function(w) { return w.index + 1; }
    };
  },
  rank: function() {
    var rank;
    return {
      init: function() { rank = 1; },
      next: function(w) {
        var i = w.index,
            data = w.data;
        return (i && w.compare(data[i - 1], data[i])) ? (rank = i + 1) : rank;
      }
    };
  },
  dense_rank: function() {
    var drank;
    return {
      init: function() { drank = 1; },
      next: function(w) {
        var i = w.index,
            d = w.data;
        return (i && w.compare(d[i - 1], d[i])) ? ++drank : drank;
      }
    };
  },
  percent_rank: function() {
    var rank = WindowOps$1.rank(),
        next = rank.next;
    return {
      init: rank.init,
      next: function(w) {
        return (next(w) - 1) / (w.data.length - 1);
      }
    };
  },
  cume_dist: function() {
    var cume;
    return {
      init: function() { cume = 0; },
      next: function(w) {
        var i = w.index,
            d = w.data,
            c = w.compare;
        if (cume < i) {
          while (i + 1 < d.length && !c(d[i], d[i + 1])) ++i;
          cume = i;
        }
        return (1 + cume) / d.length;
      }
    };
  },
  ntile: function(field, num) {
    num = +num;
    if (!(num > 0)) error('ntile num must be greater than zero.');
    var cume = WindowOps$1.cume_dist(),
        next = cume.next;
    return {
      init: cume.init,
      next: function(w) { return Math.ceil(num * next(w)); }
    };
  },

  lag: function(field, offset) {
    offset = +offset || 1;
    return {
      next: function(w) {
        var i = w.index - offset;
        return i >= 0 ? field(w.data[i]) : null;
      }
    };
  },
  lead: function(field, offset) {
    offset = +offset || 1;
    return {
      next: function(w) {
        var i = w.index + offset,
            d = w.data;
        return i < d.length ? field(d[i]) : null;
      }
    };
  },

  first_value: function(field) {
    return {
      next: function(w) { return field(w.data[w.i0]); }
    };
  },
  last_value: function(field) {
    return {
      next: function(w) { return field(w.data[w.i1 - 1]); }
    }
  },
  nth_value: function(field, nth) {
    nth = +nth;
    if (!(nth > 0)) error('nth_value nth must be greater than zero.');
    return {
      next: function(w) {
        var i = w.i0 + (nth - 1);
        return i < w.i1 ? field(w.data[i]) : null;
      }
    }
  }
};

var ValidWindowOps = Object.keys(WindowOps$1);

function WindowState(_) {
  var self = this,
      ops = array(_.ops),
      fields = array(_.fields),
      params = array(_.params),
      as = array(_.as),
      outputs = self.outputs = [],
      windows = self.windows = [],
      inputs = {},
      map = {},
      countOnly = true,
      counts = [],
      measures = [];

  function visitInputs(f) {
    array(accessorFields(f)).forEach(function(_) { inputs[_] = 1; });
  }
  visitInputs(_.sort);

  ops.forEach(function(op, i) {
    var field = fields[i],
        mname = accessorName(field),
        name = measureName(op, mname, as[i]);

    visitInputs(field);
    outputs.push(name);

    // Window operation
    if (WindowOps$1.hasOwnProperty(op)) {
      windows.push(WindowOp(op, fields[i], params[i], name));
    }

    // Aggregate operation
    else {
      if (field == null && op !== 'count') {
        error('Null aggregate field specified.');
      }
      if (op === 'count') {
        counts.push(name);
        return;
      }

      countOnly = false;
      var m = map[mname];
      if (!m) {
        m = (map[mname] = []);
        m.field = field;
        measures.push(m);
      }
      m.push(createMeasure(op, name));
    }
  });

  if (counts.length || measures.length) {
    self.cell = cell(measures, counts, countOnly);
  }

  self.inputs = Object.keys(inputs);
}

var prototype$35 = WindowState.prototype;

prototype$35.init = function() {
  this.windows.forEach(function(_) { _.init(); });
  if (this.cell) this.cell.init();
};

prototype$35.update = function(w, t) {
  var self = this,
      cell = self.cell,
      wind = self.windows,
      data = w.data,
      m = wind && wind.length,
      j;

  if (cell) {
    for (j=w.p0; j<w.i0; ++j) cell.rem(data[j]);
    for (j=w.p1; j<w.i1; ++j) cell.add(data[j]);
    cell.set(t);
  }
  for (j=0; j<m; ++j) wind[j].update(w, t);
};

function cell(measures, counts, countOnly) {
  measures = measures.map(function(m) {
    return compileMeasures(m, m.field);
  });

  var cell = {
    num:   0,
    agg:   null,
    store: false,
    count: counts
  };

  if (!countOnly) {
    var n = measures.length,
        a = cell.agg = Array(n),
        i = 0;
    for (; i<n; ++i) a[i] = new measures[i](cell);
  }

  if (cell.store) {
    var store = cell.data = new TupleStore();
  }

  cell.add = function(t) {
    cell.num += 1;
    if (countOnly) return;
    if (store) store.add(t);
    for (var i=0; i<n; ++i) {
      a[i].add(a[i].get(t), t);
    }
  };

  cell.rem = function(t) {
    cell.num -= 1;
    if (countOnly) return;
    if (store) store.rem(t);
    for (var i=0; i<n; ++i) {
      a[i].rem(a[i].get(t), t);
    }
  };

  cell.set = function(t) {
    var i, n;

    // consolidate stored values
    if (store) store.values();

    // update tuple properties
    for (i=0, n=counts.length; i<n; ++i) t[counts[i]] = cell.num;
    if (!countOnly) for (i=0, n=a.length; i<n; ++i) a[i].set(t);
  };

  cell.init = function() {
    cell.num = 0;
    if (store) store.reset();
    for (var i=0; i<n; ++i) a[i].init();
  };

  return cell;
}

/**
 * Perform window calculations and write results to the input stream.
 * @constructor
 * @param {object} params - The parameters for this operator.
 * @param {function(*,*): number} [params.sort] - A comparator function for sorting tuples within a window.
 * @param {Array<function(object): *>} [params.groupby] - An array of accessors by which to partition tuples into separate windows.
 * @param {Array<string>} params.ops - An array of strings indicating window operations to perform.
 * @param {Array<function(object): *>} [params.fields] - An array of accessors
 *   for data fields to use as inputs to window operations.
 * @param {Array<*>} [params.params] - An array of parameter values for window operations.
 * @param {Array<string>} [params.as] - An array of output field names for window operations.
 * @param {Array<number>} [params.frame] - Window frame definition as two-element array.
 * @param {boolean} [params.ignorePeers=false] - If true, base window frame boundaries on row
 *   number alone, ignoring peers with identical sort values. If false (default),
 *   the window boundaries will be adjusted to include peer values.
 */
function Window(params) {
  Transform.call(this, {}, params);
  this._mlen = 0;
  this._mods = [];
}

Window.Definition = {
  "type": "Window",
  "metadata": {"modifies": true},
  "params": [
    { "name": "sort", "type": "compare" },
    { "name": "groupby", "type": "field", "array": true },
    { "name": "ops", "type": "enum", "array": true, "values": ValidWindowOps.concat(ValidAggregateOps) },
    { "name": "params", "type": "number", "null": true, "array": true },
    { "name": "fields", "type": "field", "null": true, "array": true },
    { "name": "as", "type": "string", "null": true, "array": true },
    { "name": "frame", "type": "number", "null": true, "array": true, "length": 2, "default": [null, 0] },
    { "name": "ignorePeers", "type": "boolean", "default": false }
  ]
};

var prototype$34 = inherits(Window, Transform);

prototype$34.transform = function(_, pulse) {
  var self = this,
      state = self.state,
      mod = _.modified(),
      i, n;

  this.stamp = pulse.stamp;

  // initialize window state
  if (!state || mod) {
    state = self.state = new WindowState(_);
  }

  // retrieve group for a tuple
  var key = groupkey(_.groupby);
  function group(t) { return self.group(key(t)); }

  // partition input tuples
  if (mod || pulse.modified(state.inputs)) {
    self.value = {};
    pulse.visit(pulse.SOURCE, function(t) { group(t).add(t); });
  } else {
    pulse.visit(pulse.REM, function(t) { group(t).remove(t); });
    pulse.visit(pulse.ADD, function(t) { group(t).add(t); });
  }

  // perform window calculations for each modified partition
  for (i=0, n=self._mlen; i<n; ++i) {
    processPartition(self._mods[i], state, _);
  }
  self._mlen = 0;
  self._mods = [];

  // TODO don't reflow everything?
  return pulse.reflow(mod).modifies(state.outputs);
};

prototype$34.group = function(key) {
  var self = this,
      group = self.value[key];

  if (!group) {
    group = self.value[key] = SortedList(tupleid);
    group.stamp = -1;
  }

  if (group.stamp < self.stamp) {
    group.stamp = self.stamp;
    self._mods[self._mlen++] = group;
  }

  return group;
};

function processPartition(list, state, _) {
  var sort = _.sort,
      range = sort && !_.ignorePeers,
      frame = _.frame || [null, 0],
      data = list.data(sort),
      n = data.length,
      i = 0,
      b = range ? bisector(sort) : null,
      w = {
        i0: 0, i1: 0, p0: 0, p1: 0, index: 0,
        data: data, compare: sort || constant(-1)
      };

  for (state.init(); i<n; ++i) {
    setWindow(w, frame, i, n);
    if (range) adjustRange(w, b);
    state.update(w, data[i]);
  }
}

function setWindow(w, f, i, n) {
  w.p0 = w.i0;
  w.p1 = w.i1;
  w.i0 = f[0] == null ? 0 : Math.max(0, i - Math.abs(f[0]));
  w.i1 = f[1] == null ? n : Math.min(n, i + Math.abs(f[1]) + 1);
  w.index = i;
}

// if frame type is 'range', adjust window for peer values
function adjustRange(w, bisect) {
  var r0 = w.i0,
      r1 = w.i1 - 1,
      c = w.compare,
      d = w.data,
      n = d.length - 1;

  if (r0 > 0 && !c(d[r0], d[r0-1])) w.i0 = bisect.left(d, d[r0]);
  if (r1 < n && !c(d[r1], d[r1+1])) w.i1 = bisect.right(d, d[r1]);
}



var transforms$1 = Object.freeze({
	aggregate: Aggregate,
	bin: Bin,
	collect: Collect,
	compare: Compare,
	countpattern: CountPattern,
	cross: Cross,
	density: Density,
	extent: Extent,
	facet: Facet,
	field: Field,
	filter: Filter,
	fold: Fold,
	formula: Formula,
	generate: Generate,
	impute: Impute,
	joinaggregate: JoinAggregate,
	key: Key,
	lookup: Lookup,
	multiextent: MultiExtent,
	multivalues: MultiValues,
	params: Params,
	prefacet: PreFacet,
	project: Project,
	proxy: Proxy,
	relay: Relay,
	sample: Sample,
	sequence: Sequence,
	sieve: Sieve,
	subflow: Subflow,
	tupleindex: TupleIndex,
	values: Values,
	window: Window
});

const Ascending = 'ascending';
const Descending = 'descending';
const AggregateOps = toSet(Aggregate.Definition.params[1].values);
const WindowOps = toSet(Window.Definition.params[2].values);

function parser(p) {
  const type = p.array ? 'array' : p.type;
  return TypeParsers[type](p);
}

const TypeParsers = {
  array: p => {
    const len = p.length,
          name = p.name,
          type = TypeParsers[p.type];

    return value => {
      if (!isArray(value)) {
        error(`Expected array parameter: ${name}.`);
      }
      if (len != null && value.length !== len) {
        error(`Expected array of length ${len}: ${name}.`);
      }
      return value.map(type(p));
    };
  },

  compare: p => (value => {
    let cmp = value;
    if (cmp && isFunction(cmp.toObject)) {
      cmp = cmp.toObject();
    }
    if (isString(cmp)) cmp = array(cmp);
    if (isArray(cmp)) cmp = toCompareObject(cmp);
    return isObject(cmp) && !isFunction(cmp)
      ? isFunction(cmp.accessor)
        ? accessor(cmp.accessor, cmp.fields)
        : compare(cmp.fields, cmp.orders)
      : error(`Unrecognized comparator value for parameter: ${p.name}.`);
  }),

  enum: p => {
    const set = toSet(p.values);
    return value => set[value] ? value
      : error(`Invalid parameter value '${value+''}' for ${p.name}. Must be one of [${p.values}].`);
  },

  expr: p => (value => toExpr(value) || error(`Invalid parameter value '${value+''}' for ${p.name}.`)),

  field: p => (value => toField(value) || error(`Invalid parameter value '${value+''}' for ${p.name}.`)),

  measure: () => (list => toMeasure(list, AggregateOps)),

  window: () => (list => toMeasure(list, WindowOps)),

  boolean: () => toBoolean,

  number: () => toNumber,

  regexp: () => toRegExpString,

  string: () => toString
};

function toRegExpString(value) {
  if (isRegExp(value)) {
    let str = value + '',
        i1 = str.lastIndexOf('/');
    return str.slice(1, i1);
  } else {
    return toString(value);
  }
}

function toCompareObject(array) {
  const fields = [],
        orders = [];

  array.forEach(function(f) {
    if (!f || !isString(f)) error(`Invalid comparator field: '${f+''}'.`);
    let o = Ascending;
    if (f[0] === '-') {
      o = Descending;
      f = f.slice(1);
    } else if (f[0] === '+') {
      f = f.slice(1);
    }
    fields.push(f);
    orders.push(o);
  });

  return {fields: fields, orders: orders};
}

function toExpr(value) {
  if (value && isFunction(value.toObject)) {
    value = value.toObject();
  }
  // TODO: isString -> parse expression
  return isObject(value) && !isFunction(value)
    ? accessor(value.accessor, value.fields, value.as)
    : null;
}

function toField(value) {
  if (value && isFunction(value.toObject)) {
    value = value.toObject();
  }
  return isString(value) ? field(value)
    : isObject(value) && !isFunction(value)
    ? isFunction(value.accessor)
      ? accessor(value.accessor, value.fields, value.as)
      : field(value.field, value.as)
    : null;
}

function toMeasure(list, validOps) {
  let ops = [], fields = [], as = [], params = [];

  for (let measure of list) {
    if (isFunction(measure.toObject)) {
      measure = measure.toObject();
    }

    let op = toString(measure.op);
    if (!validOps.hasOwnProperty(op)) {
      error(`Invalid operation: ${op}.`);
    }
    ops.push(op);

    params.push(toNumber(measure.param));

    fields.push(toField(measure.field));

    as.push(measure.as ? toString(measure.as) : null);
  }

  return params.every(v => v == null)
    ? {ops: ops, fields: fields, as: as}
    : {ops: ops, fields: fields, as: as, params: params};
}

var transform$1 = function(def, arg) {
  arg = array(arg);
  let narg = arg.length,
      type = def.type.toLowerCase(),
      params = def.params,
      md = def.metadata;

  return function() {
    let t = instantiate(type, params, md),
        i = 0,
        v;
    for (; i<narg; ++i) {
      v = arguments[i];
      if (v !== undefined) t[arg[i]](v);
    }
    return t;
  };
};

function instantiate(type, params, metadata) {
  const values = {};

  const op = {
    create: (dataflow, pulse) => create$1(dataflow, pulse, type, params, values),
    metadata: () => metadata
  };

  initialize(op, params, values);

  return op;
}

function create$1(dataflow, pulse, type, params, values) {
  let q = extend({}, pulse);

  for (let p of params) {
    let name = p.name,
        alias = p.alias || p.name,
        value = values[alias],
        defined = value !== undefined;

    if (p.init && !defined) {
      let subparams = extend({}, pulse);
      for (let subp in p.init.params) {
        subparams[subp] = values[p.init.params[subp]];
      }
      q[name] = dataflow.add(transforms$1[p.init.type], subparams);
    } else if (defined) {
      if (p.proxy) {
        for (let k in value) q[k] = value[k];
      } else {
        q[name] = value;
      }
    }
  }

  return dataflow.add(transforms$1[type], q);
}

function initialize(op, params, values) {
  // initialize parameters
  for (let p of params) {
    const alias = p.alias || p.name,
          parse = parser(p);

    // generate getter / setter method
    op[alias] = function(_) {
      if (!arguments.length) return values[alias];
      // TODO: map multiple args to single array?
      values[alias] = parse(_);
      return op;
    };
  }
}

const def = extend({}, Collect.Definition);

def.params = removeParams(def.params, ['sort']);

var collect = transform$1(def);

const Output = Symbol('dataflow-output');

var dataflow = function(datasource, transforms) {
  return arguments.length < 2
    ? create(null, datasource)
    : create(datasource, transforms);
};

function create(datasource, transforms) {
  let input = null,
      output = null,
      values = null;

  function get() {
    return values.value;
  }

  const object = {
    [Output]: () => output,
    values: get,
    on: f => (runtime.addDataListener(values, f), object),
    off: f => (runtime.removeDataListener(values, f), object)
  };

  if (!datasource) {
    object.insert = function(_) {
      runtime.pulse(input, runtime.changeset().insert(_)).run();
      return object;
    };

    object.remove = function(_) {
      runtime.pulse(input, runtime.changeset().remove(_)).run();
      return object;
    };
  }

  function initialize(tranforms) {
    let source = true,
        pipeline = [collect()],
        i, n, tx, md, gen, mod, pulse, prev;

    // analyze pipeline, inject collectors as needed
    for (i=0, n=tranforms.length; i<n; ++i) {
      tx = tranforms[i];
      md = tx.metadata();

      if (!source && !md.source) {
        source = true;
        pipeline.push(collect());
      }
      pipeline.push(tx);

      if (md.generates) gen = true;
      if (md.modifies && !gen) mod = true;

      if (md.source) source = true;
      else if (md.changes) source = false;
    }
    if (!source) {
      pipeline.push(collect());
    }

    // instantiate operators
    if (datasource) {
      pulse = array(datasource).map(s => s[Output]());
      if (pulse.length === 1) pulse = pulse[0];
      prev = runtime.add(Relay, {derive: mod, pulse: pulse});
    }
    for (i=0, n=pipeline.length; i<n; ++i) {
      pulse = {pulse: prev};
      prev = pipeline[i].create(runtime, pulse);
      if (i === 0) input = prev;
    }
    output = prev;
    values = runtime.add(Sieve, {pulse: prev});

    runtime.run();
  }

  initialize(array(transforms));
  return object;
}

const def$1 = extend({}, Aggregate.Definition);

def$1.params = removeParams(def$1.params, ['ops', 'fields', 'as']);
def$1.params.push({name: 'measure', type: 'measure', proxy: true});

var aggregate = transform$1(def$1, ['groupby', 'measure']);

const def$2 = extend({}, Bin.Definition);

def$2.params = extendParams(def$2.params, {
  extent: {
    init: { type: 'extent', params: {field: 'field'} }
  }
});

var bin$1 = transform$1(def$2, 'field');

const def$3 = extend({}, CountPattern.Definition);

def$3.params = extendParams(def$3.params, {
  pattern: { type: 'regexp' },
  stopwords: { type: 'regexp' }
});

var countpattern = transform$1(def$3, ['field', 'pattern', 'case']);

var filter$1 = transform$1(Filter.Definition, 'expr');

var fold = transform$1(Fold.Definition, 'fields');

var formula = transform$1(Formula.Definition, ['as', 'expr']);

const def$4 = extend({}, JoinAggregate.Definition);

def$4.params = removeParams(def$4.params, ['ops', 'fields', 'as']);
def$4.params.push({name: 'measure', type: 'measure', proxy: true});

var joinaggregate = transform$1(def$4, ['groupby', 'measure']);

const def$5 = extend({}, Project.Definition);

def$5.params = removeParams(def$5.params, ['as']);

var project$1 = transform$1(def$5, ['fields']);

var sample = transform$1(Sample.Definition, 'size');

const def$6 = extend({}, Collect.Definition);

def$6.params = extendParams(def$6.params, {
  sort: { alias: 'compare' }
});

var sort = transform$1(def$6, 'compare');

const def$7 = extend({}, Window.Definition);

def$7.params = removeParams(def$7.params, ['ops', 'fields', 'as', 'params']);
def$7.params = extendParams(def$7.params, {
  sort: { alias: 'compare' }
});
def$7.params.push({name: 'measure', type: 'window', proxy: true});

var window = transform$1(def$7, ['compare', 'frame', 'measure']);

function apiObject(base) {
  const obj = base || {},
        api = {toObject: () => obj};

  getset(api, obj, 'as');
  for (let i=1, n=arguments.length; i<n; ++i) {
    getset(api, obj, arguments[i]);
  }

  return api;
}

function getset(api, obj, name) {
  api[name] = function(_) {
    return arguments.length ? (obj[name] = _, api) : obj[name];
  };
}

const field$1 = (f => apiObject({field: f}));

const expr = (f => apiObject({accessor: f}, 'fields'));

function op0(type) { return () => apiObject({op: type}); }
const count = op0('count');
const row_number = op0('row_number');
const rank$1 = op0('rank');
const dense_rank = op0('dense_rank');
const percent_rank = op0('percent_rank');
const cume_dist = op0('cume_dist');

function opField(type) {
  return (field) => apiObject({op: type}, 'field').field(field);
}
const valid = opField('valid');
const missing = opField('missing');
const distinct = opField('distinct');
const min$1 = opField('min');
const max$1 = opField('max');
const argmin = opField('argmin');
const argmax = opField('argmax');
const sum$1 = opField('sum');
const mean$1 = opField('mean');
const average = opField('average');
const variance$1 = opField('variance');
const variancep = opField('variancep');
const stdev = opField('stdev');
const stdevp = opField('stdevp');
const stderr = opField('stderr');
const median$1 = opField('median');
const q1 = opField('q1');
const q3 = opField('q3');
const ci0 = opField('ci0');
const ci1 = opField('ci1');
const first_value = opField('first_value');
const last_value = opField('last_value');

function opFieldParam(type) {
  return (field, param) => apiObject({op: type}, 'field', 'param').field(field).param(param);
}
const lag = opFieldParam('lag');
const lead = opFieldParam('lead');
const nth_value = opFieldParam('nth_value');

function opParam(type) {
  return (param) => apiObject({op: type}, 'param').param(param);
}
const ntile = opParam('ntile');

exports.dataflow = dataflow;
exports.aggregate = aggregate;
exports.bin = bin$1;
exports.countpattern = countpattern;
exports.filter = filter$1;
exports.fold = fold;
exports.formula = formula;
exports.joinaggregate = joinaggregate;
exports.project = project$1;
exports.sample = sample;
exports.sort = sort;
exports.window = window;
exports.field = field$1;
exports.expr = expr;
exports.count = count;
exports.row_number = row_number;
exports.rank = rank$1;
exports.dense_rank = dense_rank;
exports.percent_rank = percent_rank;
exports.cume_dist = cume_dist;
exports.valid = valid;
exports.missing = missing;
exports.distinct = distinct;
exports.min = min$1;
exports.max = max$1;
exports.argmin = argmin;
exports.argmax = argmax;
exports.sum = sum$1;
exports.mean = mean$1;
exports.average = average;
exports.variance = variance$1;
exports.variancep = variancep;
exports.stdev = stdev;
exports.stdevp = stdevp;
exports.stderr = stderr;
exports.median = median$1;
exports.q1 = q1;
exports.q3 = q3;
exports.ci0 = ci0;
exports.ci1 = ci1;
exports.first_value = first_value;
exports.last_value = last_value;
exports.lag = lag;
exports.lead = lead;
exports.nth_value = nth_value;
exports.ntile = ntile;

Object.defineProperty(exports, '__esModule', { value: true });

})));
