var tape = require('tape'),
    df = require('../');

tape('Fold transform folds data', function(test) {
  const input = [
    {foo: 0, bar: 'a', baz: 'c'},
    {foo: 1, bar: 'a', baz: 'd'},
    {foo: 2, bar: 'b', baz: 'c'},
    {foo: 3, bar: 'b', baz: 'd'}
  ];

  const flow = df.dataflow([
    df.fold(['bar', 'baz'])
  ]);

  const output = flow.insert(input).values();
  test.equal(output.length, 8);
  test.deepEqual(output[0], {foo:0, bar:'a', baz:'c', key:'bar', value:'a'});
  test.deepEqual(output[1], {foo:0, bar:'a', baz:'c', key:'baz', value:'c'});
  test.deepEqual(output[2], {foo:1, bar:'a', baz:'d', key:'bar', value:'a'});
  test.deepEqual(output[3], {foo:1, bar:'a', baz:'d', key:'baz', value:'d'});
  test.deepEqual(output[4], {foo:2, bar:'b', baz:'c', key:'bar', value:'b'});
  test.deepEqual(output[5], {foo:2, bar:'b', baz:'c', key:'baz', value:'c'});
  test.deepEqual(output[6], {foo:3, bar:'b', baz:'d', key:'bar', value:'b'});
  test.deepEqual(output[7], {foo:3, bar:'b', baz:'d', key:'baz', value:'d'});

  test.end();
});