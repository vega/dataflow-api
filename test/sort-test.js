var tape = require('tape'),
    df = require('../');

tape('Sort transform sorts data', function(test) {
  const input = [
    {foo: 3, bar: 'a'},
    {foo: 1, bar: 'a'},
    {foo: 0, bar: 'b'},
    {foo: 2, bar: 'b'}
  ];

  const flow = df.dataflow([
    df.sort('foo')
  ]);

  const output = flow.insert(input).values();
  test.equal(output.length, 4);
  test.deepEqual(output[0], input[2]);
  test.deepEqual(output[1], input[1]);
  test.deepEqual(output[2], input[3]);
  test.deepEqual(output[3], input[0]);

  test.end();
});