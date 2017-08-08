var tape = require('tape'),
    df = require('../');

tape('Sample transform samples data', function(test) {
  const input = [
    {foo: 0, bar: 'a'},
    {foo: 1, bar: 'a'},
    {foo: 2, bar: 'b'},
    {foo: 3, bar: 'b'}
  ];

  const flow = df.dataflow([
    df.sample(3)
  ]);

  const output = flow.insert(input).values();
  test.equal(output.length, 3);
  test.ok(input.indexOf(output[0]) >= 0);
  test.ok(input.indexOf(output[1]) >= 0);
  test.ok(input.indexOf(output[2]) >= 0);

  test.end();
});