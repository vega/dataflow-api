var tape = require('tape'),
    df = require('../');

tape('Operations support api', function(test) {
  let f1 = df.field('foo'),
      f2 = df.field('foo').as('bar'),
      sum1 = df.sum('foo'),
      sum2 = df.sum('bar').as('baz');

  test.deepEqual(f1.toObject(), {field:'foo'});
  test.deepEqual(f2.toObject(), {field:'foo', as:'bar'});
  test.deepEqual(sum1.toObject(), {op:'sum', field:'foo'});
  test.deepEqual(sum2.toObject(), {op:'sum', field:'bar', as:'baz'});
  test.end();
});
