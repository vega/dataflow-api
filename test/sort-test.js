var tape = require('tape'),
    df = require('../');

tape('Sort transform sorts data', function(test) {
  const input = [
    {foo: 3, bar: 'a'},
    {foo: 1, bar: 'a'},
    {foo: 0, bar: 'b'},
    {foo: 2, bar: 'b'}
  ];

  const flow1 = df.dataflow([
    df.sort('foo')
  ]);

  const output1 = flow1.insert(input).values();
  test.equal(output1.length, 4);
  test.deepEqual(output1[0], input[2]);
  test.deepEqual(output1[1], input[1]);
  test.deepEqual(output1[2], input[3]);
  test.deepEqual(output1[3], input[0]);

  const flow2 = df.dataflow([
    df.sort(df.expr((a,b) => b.foo - a.foo).fields(['foo']))
  ]);

  const output2 = flow2.insert(input).values();
  test.equal(output2.length, 4);
  test.deepEqual(output2[0], input[0]);
  test.deepEqual(output2[1], input[3]);
  test.deepEqual(output2[2], input[1]);
  test.deepEqual(output2[3], input[2]);

  test.end();
});