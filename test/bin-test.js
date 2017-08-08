var tape = require('tape'),
    df = require('../');

tape('Bin transform bins data fields', function(test) {
  const input = [
    {foo: 0, bar: 'a'},
    {foo: 1, bar: 'a'},
    {foo: 2, bar: 'b'},
    {foo: 3, bar: 'b'}
  ];

  const flow = df.dataflow([
    df.bin('foo').maxbins(2).as(['foo0', 'foo1']),
  ]);

  const output = flow.insert(input).values();
  test.equal(output.length, 4);
  test.equal(output[0].foo0, 0);
  test.equal(output[1].foo0, 0);
  test.equal(output[2].foo0, 2);
  test.equal(output[3].foo0, 2);
  test.equal(output[0].foo1, 2);
  test.equal(output[1].foo1, 2);
  test.equal(output[2].foo1, 4);
  test.equal(output[3].foo1, 4);

  test.end();
});