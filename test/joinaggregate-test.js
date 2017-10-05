var tape = require('tape'),
df = require('../');

tape('JoinAggregate transform aggregates and joins data', function(test) {
  const input = [
    {foo: 0, bar: 'a'},
    {foo: 1, bar: 'a'},
    {foo: 2, bar: 'b'},
    {foo: 3, bar: 'b'}
  ];

  const flow = df.dataflow([
  df.joinaggregate()
    .groupby(['bar'])
    .measure([df.count().as('cnt'), df.sum('foo')])
  ]);

  const output = flow.insert(input).values();
  test.equal(output.length, 4);
  test.deepEqual(output[0], {foo: 0, bar:'a', cnt:2, sum_foo:1});
  test.deepEqual(output[1], {foo: 1, bar:'a', cnt:2, sum_foo:1});
  test.deepEqual(output[2], {foo: 2, bar:'b', cnt:2, sum_foo:5});
  test.deepEqual(output[3], {foo: 3, bar:'b', cnt:2, sum_foo:5});

  test.end();
});