var tape = require('tape'),
    df = require('../');

tape('Formula transform adds derived field to data', function(test) {
  const input = [
    {foo: 0, bar: 'a'},
    {foo: 1, bar: 'a'},
    {foo: 2, bar: 'b'},
    {foo: 3, bar: 'b'}
  ];

  const flow = df.dataflow([
    df.formula('baz', d => 1 + d.foo * d.foo)
  ]);

  const output = flow.insert(input).values();
  test.equal(output.length, 4);
  test.equal(output[0].baz, 1);
  test.equal(output[1].baz, 2);
  test.equal(output[2].baz, 5);
  test.equal(output[3].baz, 10);

  test.end();
});