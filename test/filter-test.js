var tape = require('tape'),
    df = require('../');

tape('Filter transform filters data', function(test) {
  const input = [
    {foo: 0, bar: 'a'},
    {foo: 1, bar: 'a'},
    {foo: 2, bar: 'b'},
    {foo: 3, bar: 'b'}
  ];

  const flow = df.dataflow([
    df.filter(df.expr(d => d.foo > 1).fields(['foo']))
  ]);

  const output = flow.insert(input).values();
  test.equal(output.length, 2);
  test.deepEqual(output, input.slice(2));

  test.end();
});