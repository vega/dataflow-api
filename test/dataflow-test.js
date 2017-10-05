var tape = require('tape'),
    df = require('../'),
    expr = df.expr(d => 1 + d.foo * d.foo, ['foo']);

tape('Dataflow supports listener', function(test) {
  const input = [
    {foo: 0, bar: 'a'},
    {foo: 1, bar: 'a'},
    {foo: 2, bar: 'b'},
    {foo: 3, bar: 'b'}
  ];

  let count = 0;

  const f = function(values) {
    test.equal(values.length, 4);
    test.equal(count, 0);
    ++count;
    if (count === 1) {
      flow.off(f).on(g).insert({foo: 4, bar: 'c'});
    }
  };

  const g = function(values) {
    test.equal(values.length, 5);
    test.equal(count, 1);
    test.end();
  };

  const flow = df.dataflow([
    df.formula('baz', expr)
  ]);

  flow.on(f).insert(input);
});

tape('Dataflow supports derived flows', function(test) {
  const input = [
    {foo: 0, bar: 'a'},
    {foo: 1, bar: 'a'},
    {foo: 2, bar: 'b'},
    {foo: 3, bar: 'b'}
  ];

  const copy = JSON.parse(JSON.stringify(input));

  // create source flow, ensure appropriate methods defined
  const flow1 = df.dataflow([]);
  test.ok(flow1.insert);
  test.ok(flow1.remove);

  // run source flow, check output
  const output1 = flow1.insert(input).values();
  test.deepEqual(input, output1);

  // create derived flow, ensure appropriate methods defined
  const flow2 = df.dataflow(flow1, [
    df.formula('baz', expr)
  ]);
  test.ok(!flow2.insert);
  test.ok(!flow2.remove);

  // run derived flow, check output
  let output2 = flow2.values();
  test.equal(output2.length, 4);
  test.equal(output2[0].baz, 1);
  test.equal(output2[1].baz, 2);
  test.equal(output2[2].baz, 5);
  test.equal(output2[3].baz, 10);

  // ensure derived flow does not pollute source flow
  test.deepEqual(input, copy);
  test.deepEqual(output1, copy);
  test.notDeepEqual(output2, copy);

  // insert values into source flow
  // check output of derived flow
  flow1.insert({foo: 4, bar: 'c'}).values();
  output2 = flow2.values();
  test.equal(output2.length, 5);
  test.equal(output2[0].baz, 1);
  test.equal(output2[1].baz, 2);
  test.equal(output2[2].baz, 5);
  test.equal(output2[3].baz, 10);
  test.equal(output2[4].baz, 17);

  test.end();
});

tape('Dataflow supports unioned flows', function(test) {
  const input1 = [
    {foo: 0, bar: 'a'},
    {foo: 1, bar: 'a'}
  ];

  const input2 = [
    {foo: 2, bar: 'b'},
    {foo: 3, bar: 'b'}
  ];

  // create source flow, ensure appropriate methods defined
  const flow1 = df.dataflow();
  const flow2 = df.dataflow();
  const flow3 = df.dataflow([flow1, flow2], []);

  flow1.insert(input1);
  flow2.insert(input2);

  const output = flow3.values();
  test.equal(output.length, 4);
  test.deepEqual(output, input1.concat(input2));

  test.end();
});
