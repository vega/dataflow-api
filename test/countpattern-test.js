var tape = require('tape'),
    df = require('../');

tape('CountPattern transform counts patterns', function(test) {
  const input = [
    {foo: 0, bar: 'a'},
    {foo: 1, bar: 'a'},
    {foo: 2, bar: 'b'},
    {foo: 3, bar: 'b'}
  ];

  const flow = df.dataflow([
    df.countpattern('bar', /[a-z]+/)
  ]);

  const output = flow.insert(input).values();
  test.equal(output.length, 2);
  test.deepEqual(output[0], {text:'a', count:2});
  test.deepEqual(output[1], {text:'b', count:2});

  test.end();
});