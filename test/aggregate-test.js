var tape = require('tape'),
    df = require('../');

tape('Aggregate transform aggregates data', function(test) {
  const input = [
    {foo: 0, bar: 'a'},
    {foo: 1, bar: 'a'},
    {foo: 2, bar: 'b'},
    {foo: 3, bar: 'b'}
  ];

  const flow = df.dataflow([
    df.aggregate()
      .groupby(['bar'])
      .measure([df.count().as('cnt'), df.sum('foo')])
  ]);

  const output = flow.insert(input).values();
  test.equal(output.length, 2);
  test.deepEqual(output[0], {bar:'a', cnt:2, sum_foo:1});
  test.deepEqual(output[1], {bar:'b', cnt:2, sum_foo:5});

  test.end();
});

tape('Aggregate transform rejects unknown op', function(test) {
  test.throws(function() {
    df.aggregate()
      .groupby(['bar'])
      .measure([{op: 'rank', field: 'foo'}])
  });
  test.end();
});