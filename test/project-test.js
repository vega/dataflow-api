var tape = require('tape'),
    df = require('../');

tape('Project transform projects data', function(test) {
  const input = [
    {foo: 0, bar: 'a'},
    {foo: 1, bar: 'a'}
  ];

  // test with field string
  const flow1 = df.dataflow([
    df.project(['foo'])
  ]);
  const output1 = flow1.insert(input).values();
  test.equal(output1.length, 2);
  test.deepEqual(output1[0], {foo:0});
  test.deepEqual(output1[1], {foo:1});

  // test with field api
  const flow2 = df.dataflow([
    df.project([df.field('foo').as('baz')])
  ]);
  const output2 = flow2.insert(input).values();
  test.equal(output2.length, 2);
  test.deepEqual(output2[0], {baz:0});
  test.deepEqual(output2[1], {baz:1});

  // test with field object
  const flow3 = df.dataflow([
    df.project([{field:'foo', as:'baz'}])
  ]);
  const output3 = flow3.insert(input).values();
  test.equal(output3.length, 2);
  test.deepEqual(output3[0], {baz:0});
  test.deepEqual(output3[1], {baz:1});

  // test with field expression
  const flow4 = df.dataflow([
    df.project([
      df.expr(_ => _.foo+2).fields(['foo']).as('fop')
    ])
  ]);
  const output4 = flow4.insert(input).values();
  test.equal(output4.length, 2);
  test.deepEqual(output4[0], {fop:2});
  test.deepEqual(output4[1], {fop:3});

  test.end();
});
