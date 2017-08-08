var tape = require('tape'),
    df = require('../');

tape('Window transform windows data', function(test) {
  const input = [
    {foo: 0, bar: 'a'},
    {foo: 1, bar: 'a'},
    {foo: 2, bar: 'b'},
    {foo: 3, bar: 'b'}
  ];

  const flow = df.dataflow([
    df.window('foo', [null, null])
      .groupby(['bar'])
      .measure([df.rank(), df.sum('foo')])
  ]);

  const output = flow.insert(input).values();
  test.equal(output.length, 4);
  test.deepEqual(output[0], {foo:0, bar:'a', rank:1, sum_foo:1});
  test.deepEqual(output[1], {foo:1, bar:'a', rank:2, sum_foo:1});
  test.deepEqual(output[2], {foo:2, bar:'b', rank:1, sum_foo:5});
  test.deepEqual(output[3], {foo:3, bar:'b', rank:2, sum_foo:5});

  test.end();
});