# dataflow-api

JavaScript API for dataflow processing using the [vega-dataflow](https://github.com/vega/vega-dataflow) reactive engine. Perform common database operations (sorting, filtering, aggregation, window calculations) over JavaScript objects. Build and compose transformation pipelines over streaming data.

## Installing

If you use NPM, `npm install dataflow-api`. Otherwise, download the [latest release](https://github.com/vega/dataflow-api/releases/latest). You can also load directly from GitHub as a [standalone library](https://vega.github.io/vega/dataflow-api/dataflow-api.v1.min.js). AMD, CommonJS, and vanilla environments are supported. In vanilla, a `df` global is exported:

```html
<script src="https://vega.github.io/dataflow-api/dataflow-api.v0.min.js"></script>
<script>
var flow = df.dataflow([
  df.aggregate()
    .groupby(['category'])
    .measure([df.count(), df.sum('amount').as('sum')])
]);

flow.insert([
  {category: 'a', amount: 12},
  {category: 'a', amount: 5},
  {category: 'b', amount: 11}
]);

// [{category: 'a', count: 2, sum: 17}, {category: 'b', count: 1, sum: 11}]
console.log(flow.values());
</script>
```

## API Reference

* [Dataflows](#dataflow)
* [Transforms](#transforms)
* [Parameter Types](#parameter-types)
* [Aggregate Operations](#aggregate-operations)
* [Window Operations](#window-operations)

### Dataflows

A dataflow is a processing pipeline that consists of a sequence of data [transforms](#transforms). A dataflow can either be a standalone dataflow that allows data objects to be added or removed, or a _derived_ dataflow that processes the output of an upstream flow. All dataflows are _reactive_: they automatically re-evaluate upon changes to input data or upstream flows.

<a name="dataflow" href="#dataflow">#</a>
df.<b>dataflow</b>([<i>source</i>,] <i>transforms</i>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/dataflow.js "Source")

Creates and returns a new dataflow. The required _transforms_ parameter is an array of [transform descriptions](#transforms). To create a dataflow that accepts input data, the _transforms_ array should be provided as the sole argument. To instead create a _derived_ flow, the first argument should be a _source_ dataflow which the new dataflow will consume.

<a name="dataflow_values" href="#dataflow_values">#</a>
dataflow.<b>values</b>()
[<>](https://github.com/vega/dataflow-api/blob/master/src/dataflow.js "Source")

Returns the output array of data objects for the dataflow. To avoid a potentially expensive data copy, the values array is the same instance used internally by the dataflow. Making modifications to the array or any contained data objects may corrupt the state of the dataflow, affecting future updates.

<a name="dataflow_insert" href="#dataflow_insert">#</a>
dataflow.<b>insert</b>(data)
[<>](https://github.com/vega/dataflow-api/blob/master/src/dataflow.js "Source")

Inserts one or more input _data_ objects into the dataflow. The input _data_ to insert can either be a single data object or an array of objects. Upon insertion, the dataflow is automatically re-evaluated, potentially changing the output values. Note that _derived_ dataflows do not support an insert method.

<a name="dataflow_remove" href="#dataflow_remove">#</a>
dataflow.<b>remove</b>(data)
[<>](https://github.com/vega/dataflow-api/blob/master/src/dataflow.js "Source")

Removes one or more input _data_ objects from the dataflow. The input _data_ to remove can either be a single data object or an array of objects. The _data_ to remove must have already been passed as input to the dataflow via the [insert](#dataflow_insert) method; if not, the resulting behavior is undefined. Upon removal, the dataflow is automatically re-evaluated, potentially changing the output values. Note that _derived_ dataflows do not support a remove method.

<a name="dataflow_on" href="#dataflow_on">#</a>
dataflow.<b>on</b>(callback)
[<>](https://github.com/vega/dataflow-api/blob/master/src/dataflow.js "Source")

Adds a listener _callback_ function that is invoked when the dataflow output values update. The callback is invoked within a `setTimeout` call after dataflow execution completes. To subsequently remove the listener, use the [off](#dataflow_off) method.

The _callback_ function is invoked with a single argument containing the array of output data values. To avoid a potentially expensive data copy, the values array is the same instance used internally by the dataflow. Making modifications to the array or any contained data objects may corrupt the state of the dataflow, affecting future updates.

```js
dataflow.on(function(values) {
  // this method is invoked when the output values update
  // the values array is from the internal dataflow state and is *not* copied
  // make a defensive copy if you wish to modify the array
  console.log(values);
});
```

<a name="dataflow_off" href="#dataflow_off">#</a>
dataflow.<b>off</b>(callback)
[<>](https://github.com/vega/dataflow-api/blob/master/src/dataflow.js "Source")

Removes a listener _callback_ function that was added using the [on](#dataflow_on) method.

### Transforms

Transform operators that process data within a dataflow:

* [aggregate](#aggregate) - Group and summarize data objects.
* [bin](#bin) - Discretize numeric values into uniform bins.
* [countpattern](#countpattern) - Count the frequency of patterns in text strings.
* [filter](#filter) - Filter a data stream using a predicate expression.
* [fold](#fold) - Collapse selected data fields into key and value properties.
* [formula](#formula) - Extend data objects with derived fields using a formula expression.
* [joinaggregate](#joinaggregate) - Extend data objects with calculated aggregate values.
* [project](#project) - Generate derived data objects with a selected set of fields.
* [sample](#sample) - Randomly sample a subset of data objects.
* [sort](#sort) - Sort data objects by the specified fields.
* [window](#window) - Calculate over ordered groups, including ranking and running totals.

<a name="aggregate" href="#aggregate">#</a>
df.<b>aggregate</b>([<i>groupby</i>, <i>measure</i>])
[<>](https://github.com/vega/dataflow-api/blob/master/src/transforms/aggregate.js "Source")

Creates a new aggregate transform specification. The aggregate transform groups and summarizes an input data stream to produce a new output stream. Aggregate transforms can be used to compute counts, sums, averages and other descriptive statistics over groups of data objects. The optional arguments _groupby_ and _measure_ are shorthands for the corresponding parameter methods.

#### Example Use

```js
// Generate new data objects for each per-category count and amount sum
df.aggregate()
  .groupby(['category'])
  .measure([df.count().as('cnt'), df.sum('amount')])

// Identical specification using shorthand arguments
df.aggregate(['category'], [df.count().as('cnt'), df.sum('amount')])

// Identical specification using measure object notation
df.aggregate(['category'], [
  {op: 'count', as: 'cnt'},
  {op: 'sum', field: 'amount'}
])
```

#### Aggregate Parameters

| Name                | Type                            | Description   |
| :------------------ | :-----------------------------: | :------------ |
| groupby             | [Array](#array) &lt; [Field](#field) &gt; | The data fields to group by. If not specified, a single group containing all data objects will be used.|
| measure             | [Array](#array) &lt; [Measure](#measure) &gt; | The aggregate measures to compute. If not specified, a single count aggregate is performed. The measures can use any supported [aggregate operation|(#aggregate-operations).|
| cross               | [Boolean](#boolean) | Indicates if the full cross-product of all groupby values should be included in the aggregate output (default `false`). If `true`, all possible combinations of groupby field values will be considered and zero count groups will be generated and returned for combinations that do not occur in the data itself. Cross-product output act as if the _drop_ parameter is `false`. In the case of streaming updates, the number of output groups will increase if new groupby field values are observed; all prior groups will be retained. This parameter can be useful for generating facets that include groups for all possible partitions of the data.|
| drop                | [Boolean](#boolean) | Indicates if empty (zero count) groups should be dropped (default `true`). When a data stream changes, aggregation groups may become empty. By default, the group is removed from the output. However, in some cases (such as histograms), one may wish to retain empty groups.|

<a name="bin" href="#bin">#</a>
df.<b>bin</b>([<i>field</i>])
[<>](https://github.com/vega/dataflow-api/blob/master/src/transforms/bin.js "Source")

Creates a new **bin** transform specification. The bin transform discretizes numeric values into a set of bins. A common use case is to create a histogram. The optional argument _field_ is a shorthand for the corresponding parameter method.

#### Example Use

```js
// Bin the 'amount' field, up to a maximum of 30 bins
// Write the bin boundaries to the fields 'bin_start' and 'bin_end'
df.bin().field('amount').maxbins(30).as(['bin_start', 'bin_end'])

// Identical specification using shorthand arguments
df.bin('amount').maxbins(30).as(['bin_start', 'bin_end'])
```

#### Bin Parameters

| Name                | Type                            | Description   |
| :------------------ | :-----------------------------: | :------------ |
| field               | [Field](#field)                 | **Required.** The data field to bin.|
| extent              | [Array](#array) &lt; [Number](#number) &gt; |  A two-element array with the minimum and maximum values of the bin range. If unspecified, the extent is set to `[min, max]` of the observed data values.|
| anchor              | [Number](#number)               | A value in the binned domain at which to anchor the bins, shifting the bin boundaries if necessary to ensure that a boundary aligns with the anchor value. By default, the minimum bin extent value serves as the anchor.|
| maxbins             | [Number](#number)               | The maximum number of bins to create (default `20`).|
| base                | [Number](#number)               | The number base to use for automatic bin determination (default `10`).|
| step                | [Number](#number)               | An exact step size to use between bins. If provided, options such as _maxbins_ will be ignored.|
| steps               | [Array](#array) &lt; [Number](#number) &gt; | An array of allowable step sizes to choose from.|
| minstep             | [Number](#number)               | The minimum allowed bin step size (default `0`).|
| divide              | [Array](#array) &lt; [Number](#number) &gt; | Allowable bin step sub-divisions. The default value is `[5, 2]`, which indicates that for base 10 numbers (the default base) automatic bin determination can consider dividing bin step sizes by 5 and/or 2.|
| nice                | [Boolean](#boolean)             | If `true` (the default), attempts to make the bin boundaries use human-friendly boundaries, such as multiples of ten.|
| as                  | [Array](#array) &lt; [String](#string) &gt;  | The output field names at which to write the start and end bin values. The default is `["bin0", "bin1"]`.|

<a name="countpattern" href="#countpattern">#</a>
df.<b>countpattern</b>([<i>field</i>, <i>pattern</i>, <i>case</i>])
[<>](https://github.com/vega/dataflow-api/blob/master/src/transforms/countpattern.js "Source")

Creates a new **countpattern** transform specification. The countpattern transform counts the number of occurrences of a text pattern, as defined by a regular expression. This transform will iterate through each data object and count all unique pattern matches found within the designated text field. The optional arguments _field_, _pattern_ and _case_ are shorthands for the corresponding parameter methods.

#### Example Use

```js
// Count all alphabetic substrings in the 'description' field
// This example maps all input text to lowercase.
df.countpattern().field('description').pattern(/[a-z]+/).case('lower')

// Identical specification using shorthand arguments
df.countpattern('description', /[a-z]+/, 'lower')
```

#### CountPattern Parameters

| Name                | Type                            | Description   |
| :------------------ | :-----------------------------: | :------------ |
| field               | [Field](#field)                 | **Required.** The data field containing the text data.|
| pattern             | [RegExp](#regexp)               | A regular expression indicating the pattern to count. All unique pattern matches will be separately counted. The default value is `[\\w\']+`, which will match sequences containing word characters and apostrophes, but no other characters.|
| case                | [String](#string)               | A lower- or upper-case transformation to apply prior to pattern matching. One of `"lower"`, `"upper"` or `"mixed"` (the default).|
| stopwords           | [String](#string)               | A regular expression defining a pattern of text to ignore. For example, the value `"(foo|bar|baz)"` will treat the words `"foo"`, `"bar"` and `"baz"` as stopwords that should be ignored. The default value is the empty string (`""`), indicating no stop words.|
| as                  | [Array](#array) &lt; [String](#string) &gt; | The output field names for the text pattern and occurrence count. The default is `["text", "count"]`.|

<a name="filter" href="#filter">#</a>
df.<b>filter</b>([<i>expr</i>])
[<>](https://github.com/vega/dataflow-api/blob/master/src/transforms/filter.js "Source")

Creates a new **filter** transform specification. The filter transform removes objects from a data stream based on a provided filter expression. The optional argument _expr_ is a shorthand for the corresponding parameter method.

#### Example Use

```js
let predicate = df.expr(d => d.amount > 100).fields(['amount'])

// Remove data objects with 'amount' values <= 100
df.filter().expr(predicate)

// Identical specification using shorthand arguments
df.filter(predicate)
```

#### Filter Parameters

| Name                | Type                        | Description   |
| :------------------ | :-------------------------: | :------------ |
| expr                | [Expression](#expression)   | **Required.** A predicate function for filtering the data. If the expression evaluates to `false`, the data object will be filtered.|

<a name="fold" href="#fold">#</a>
df.<b>fold</b>([<i>fields</i>])
[<>](https://github.com/vega/dataflow-api/blob/master/src/transforms/fold.js "Source")

Creates a new **fold** transform specification. The fold transform collapses (or “folds”) one or more data fields into two properties: a _key_ property (containing the original data field name) and a _value_ property (containing the data value). The fold transform is useful for mapping matrix or cross-tabulation data into a standardized format. This transform generates a new data stream in which each data object consists of the _key_ and _value_ properties as well as all the original fields of the corresponding input data object. The optional argument _fields_ is a shorthand for the corresponding parameter method.

#### Example Use

```js
// Collapse the 'fieldA' and 'fieldB' fields into key-value pairs
// The output stream will contain twice as many data objects
df.fold().fields(['fieldA', 'fieldB'])

// Identical specification using shorthand arguments
df.fold(['fieldA', 'fieldB'])
```

#### Fold Parameters

| Name                | Type                            | Description   |
| :------------------ | :-----------------------------: | :------------ |
| fields              | [Array](#array) &lt; [Field](#field) &gt;  | **Required.** An array of data fields indicating the properties to fold.|
| as                  | [Array](#array) &lt; [String](#string) &gt; | The output field names for the _key_ and _value_ properties produced by the fold transform. The default is `["key", "value"]`.|

<a name="formula" href="#formula">#</a>
df.<b>formula</b>([<i>as</i>, <i>expr</i>])
[<>](https://github.com/vega/dataflow-api/blob/master/src/transforms/formula.js "Source")

Creates a new **formula** transform specification. The formula transform extends data objects with new values according to a calculation formula. The optional arguments _as_ and _expr_ are shorthands for the corresponding parameter methods.

#### Example Use

```js
let mag = df.expr(d => Math.sqrt(d.u * d.u + d.v * d.v)).fields(['u', 'v'])

// Extend each object with a 'magnitude' field defined by the given function
df.formula().as('magnitude').expr(mag)

// Identical specification using shorthand arguments
df.formula('magnitude', mag)
```

#### Formula Parameters

| Name                | Type                           | Description   |
| :------------------ | :----------------------------: | :------------ |
| expr                | [Expression](#expression)      | **Required.** The formula function for calculating derived values.|
| as                  | [String](#string)              | **Required.** The output field at which to write the formula value.|
| initonly            | [Boolean](#boolean)            | If `true`, the formula is evaluated only when a data object is first observed. The formula values will _not_ automatically update if data objects are modified. The default is `false`.|

<a name="joinaggregate" href="#joinaggregate">#</a>
df.<b>joinaggregate</b>([<i>groupby</i>, <i>measure</i>])
[<>](https://github.com/vega/dataflow-api/blob/master/src/transforms/joinaggregate.js "Source")

Creates a new **joinaggregate** transform specification. The joinaggregate transform extends the input data objects with aggregate values. Aggregation is performed and the results are then joined with the input data. This transform can be helpful for creating derived values that combine both raw data and aggregate calculations, such as percentages of group totals. The optional arguments _groupby_ and _measure_ are shorthands for the corresponding parameter methods.

The parameters for this transform are identical to the [aggregate](#aggregate) transform, but rather than creating new output objects, the results are written back to each of the input data objects. An equivalent result can be achieved using a [window](#window) transform where the sliding window frame encompasses the entire group; however, the joinaggregate provides a more performant alternative for this special case.

#### Example Use

```js
// Extend each data object with per-category counts and sum(amount)
df.joinaggregate()
  .groupby(['category'])
  .measure([df.count().as('cnt'), df.sum('amount')])

// Identical specification using shorthand arguments
df.joinaggregate(['category'], [df.count().as('cnt'), df.sum('amount')])

// Identical specification using measure object notation
df.joinaggregate(['category'], [
  {op: 'count', as: 'cnt'},
  {op: 'sum', field: 'amount'}
])
```

#### JoinAggregate Parameters

| Name                | Type                            | Description   |
| :------------------ | :-----------------------------: | :------------ |
| groupby             | [Array](#array) &lt; [Field](#field) &gt; | The data fields to group by. If not specified, a single group containing all data objects will be used.|
| measure             | [Array](#array) &lt; [Measure](#measure) &gt; | The aggregate measures to compute. If not specified, a single count aggregate is performed. The measures can use any supported [aggregate operation|(#aggregate-operations).|

<a name="project" href="#project">#</a>
df.<b>project</b>([<i>fields</i>])
[<>](https://github.com/vega/dataflow-api/blob/master/src/transforms/project.js "Source")

Creates a new **project** transform specification. The project transform performs a [relational algebra projection operation](https://en.wikipedia.org/wiki/Projection_(relational_algebra). Thie transform produces a stream of new data objects that include one or more fields of the source stream, with the data fields optionally renamed. The optional argument _fields_ is a shorthand for the corresponding parameter method.

#### Example Use

```js
// Project the 'amount' field to new objects with a single field named 'value'
df.project().fields([df.field('amount').as('value')])

// Identical specification using shorthand arguments
df.project([df.field('amount').as('value')])

// Identical specification using field object notation
df.project([{field: 'amount', as: 'value'}])
```

#### Project Parameters

| Name                | Type                           | Description   |
| :------------------ | :----------------------------: | :------------ |
| fields              | [Array](#array) &lt; [Field](#field) &gt; | The data fields that should be copied over in the projection. If unspecified, all fields will be copied using their existing names.|

<a name="sample" href="#sample">#</a>
df.<b>sample</b>([<i>size</i>])
[<>](https://github.com/vega/dataflow-api/blob/master/src/transforms/sample.js "Source")

Creates a new **sample** transform specification. The sample transform randomly samples a data stream to create a smaller stream. As input data objects are added and removed, the sampled values may change in first-in, first-out manner. This transform uses [reservoir sampling](https://en.wikipedia.org/wiki/Reservoir_sampling) to maintain a representative sample of the stream. The optional argument _size_ is a shorthand for the corresponding parameter method.

#### Example Use

```js
// Collect a random sample of 500 data objects
df.sample().size(500)

// Identical specification using shorthand arguments
df.sample(500)
```

#### Sample Parameters

| Name                | Type                           | Description   |
| :------------------ | :----------------------------: | :------------ |
| size                | [Number](#number)              | The maximum number of data objects to include in the sample. The default value is `1000`.|

<a name="sort" href="#sort">#</a>
df.<b>sort</b>([<i>compare</i>])
[<>](https://github.com/vega/dataflow-api/blob/master/src/transforms/sort.js "Source")

Creates a new **sort** transform specification. This transform materializes all the objects in a data stream within a single array, allowing sorting by data field values. The optional argument _compare_ is a shorthand for the corresponding parameter method.

#### Example Use

```js
// Sort in descending order by the 'amount' field
df.sort().compare('-amount')

// Identical specification using shorthand arguments
df.sort('-amount')

// Identical specification using comparator object notation
df.sort({fields: ['amount'], orders: ['descending']})

// Identical specification using an explicit comparator expression
df.sort(df.expr((a, b) => b.amount - a.amount).fields(['amount']))
```

#### Sort Parameters

| Name                | Type                           | Description   |
| :------------------ | :----------------------------: | :------------ |
| compare             | [Compare](#compare)            | A comparator for sorting data objects.|

<a name="window" href="#window">#</a>
df.<b>window</b>([<i>compare</i>, <i>frame</i>, <i>measure</i>])
[<>](https://github.com/vega/dataflow-api/blob/master/src/transforms/window.js "Source")

Creates a new **window** transform specification. The window transform performs calculations over sorted groups of data objects. These calculations including ranking, lead/lag analysis, and aggregates such as running sums and averages. Calculated values are written back to the input data stream. The optional arguments _compare_, _frame_ and _measure_ are shorthands for the corresponding parameter methods.

#### Example Use

```js
df.window()
  .compare('amount')
  .frame([null, null])
  .measure([df.rank(), df.sum('amount')])
  .groupby(['category'])

// Identical specification using shorthand arguments
df.window('amount', [null, null], [df.rank(), df.sum('amount')])
  .groupby(['category'])

// Identical specification using measure object notation
df.window('amount', [null, null], [
  {op: 'rank'},
  {op: 'sum', field: 'amount'}
]).groupby(['category'])
```

#### Window Parameters

| Name                | Type                            | Description   |
| :------------------ | :-----------------------------: | :------------ |
| compare             | [Compare](#compare)             | A comparator for sorting data objects within a window. If two data objects are considered equal by the comparator, they are considered "peer" values of equal rank. If _compare_ is not specified, the order is undefined: data objects are processed in the order they are observed and none are considered peers (the _ignorePeers_ parameter is ignored and treated as if set to `true`).|
| groupby             | [Array](#array) &lt; [Field](#field) &gt; | The data fields by which to partition data objects into separate windows. If not specified, a single group containing all data objects will be used.|
| measure             | [Array](#array) &lt; [Measure](#measure) &gt; | The window measures to compute. The measures can use any supported [aggregate operation|(#aggregate-operations) or [window operation|(#window-operations).|
| frame               | [Array](#array) &lt; [Number](#number) &gt;  | A frame specification as a two-element array indicating how the sliding window should proceed. The array entries should either be a number indicating the offset from the current data object, or `null` to indicate unbounded rows preceding or following the current data object. The default value is `[null, 0]`, indicating that the sliding window includes the current object and all preceding objects. The value `[-5, 5]` indicates that the window should include five objects preceding and five objects following the current object. Finally, `[null, null]` indicates that the window frame should always include all data objects.|
| ignorePeers         | [Boolean](#boolean)  | Indicates if the sliding window frame should ignore peer values. (Peer values are those considered identical by the _compare_ criteria). The default is `false`, causing the window frame to expand to include all peer values. If set to `true`, the window frame will be defined by offset values only. This setting only affects those operations that depend on the window frame: aggregation operations and the *first_value*, *last_value*, and *nth_value* window operations.|

### Parameter Types

Parameter types for dataflow transforms:

* [Array](#array)
* [Boolean](#boolean)
* [Compare](#compare)
* [Expression](#expression)
* [Field](#field)
* [Measure](#measure)
* [Number](#number)
* [RegExp](#regexp)
* [String](#string)

<a name="array" href="#array">#</a> <b>Array</b>

An `Array` instance representing a collection of values.

<a name="boolean" href="#boolean">#</a> <b>Boolean</b>

A `Boolean` value. The values `null` and `""` map to `null`. The strings `"false"` and `"0"` map to `false`. Any other values are subject to boolean coercion (`!!value`).

<a name="compare" href="#compare">#</a> <b>Compare</b>

A comparator is a function that takes two arguments _a_ and _b_ as input and compares them to determine a rank ordering, return a value less than zero if _a &lt; b_, a value greater than zero if _a &gt; b_, and zero if the two values are equivalent. Comparators can be specified in multiple ways:

- A string indicating a field to order by, optionally annotated with a `+` or `-` prefix to indicate ascending or descending sort, respectively. If no prefix is supplied an ascending order is assumed. For example: `"amount"` (implicit ascending order), `"+amount"` (explicit ascending order), `"-amount"` (descending order).
- An array of comparator strings specifying multi-field ordering criteria. For example: `["-amount", "+age"]`.
- An object with `fields` and `orders` properties providing an array of data fields to order by and an array of corresponding orders (`"ascending"` or `"descending"`). For example: `{fields: ["amount, age"], "orders: ["descending", "ascending"]}`.
- An explicit comparator [expression](#expression). For example: `df.expr((a, b) => (b.amount - a.amount) || (a.age - b.age)).fields(['amount', 'age'])`.

<a name="expression" href="#expression">#</a> <b>Expression</b>

An expression is a function that takes one or more data objects as arguments and returns a calculated value. Expressions are useful as filtering predicates and formula calculations, or to provide customized comparators.

Expressions should be constructed using the `expr` API: `df.expr(datum => datum.x * datum.x + datum.y * datum.y).fields(['x', 'y'])`.

<a name="field" href="#field">#</a> <b>Field</b>

A field is a named data attribute (or in tabular terms, a data column). These fields correspond to possibly nested properties of a data object. Field references can be specified in multiple ways:

- A convenience API method of the form `df.field("field").as("name")`, indicating the string field name (or an accessor function) and optional name alias for output.
- A string indicating the field name. Nested fields are indicated using dot (`.`) or bracket (`[]`) notation. For example: `"amount"`, `"source.x"`, `"target['x']"`. To specify field names that contain dots but are _not_ nested lookups, escape the dot inline (`"my\\.field"`) or enclose the field name in brackets (`"[my.field]"`).
- An object with a `field` property and optional `as` property. The `field` property should be either a string field name or an expression function. The optional `as` property specifies a name for the field, and can be used to specify the output names for a [project](#project) transform or [aggregate](#aggregate) groupby. If `as` is not specified, a given `field` name string will be used.
- An [expression](#expression) function that takes a data object as input and returns a value. This option can be used to create virtual fields that are actually derived values of the named properties of the object. For example: `df.expr(d => Math.sqrt(d.amount)).fields(['amount']).as('sqrt_amount')`.

<a name="measure" href="#measure">#</a> <b>Measure</b>

A measure is a [window](#window-operations) or [aggregate](#aggregate-operations) operation to apply across a collection of data values. Measures can be specified in multiple ways:

- Convenience API methods for each [window](#window-operations) and [aggregate](#aggregate-operations) operation. For example: `df.sum('amount')`, `df.ntile(4)`.
- An object specifying the operation. For example: `{"op": "sum", "field": "amount"}`, `{"op": "ntile", "param": 4}`. The supported object properties are:
  - `op`: the window or aggregate operation name. This property is **required** in all cases.
  - `field`: a data field reference. This property is required for all aggregate operations and for window operations that operate over data field values.
  - `param`: an operation parameter. Applicable only to a subset of window operations.
  - `as`: output field name. Optional property to specify the output field.

<a name="number" href="#number">#</a> <b>Number</b>

A `Number` value. The values `null` and `""` map to `null`. Any other values are subject to number coercion (`+value`).

<a name="regexp" href="#regexp">#</a> <b>RegExp</b>

A `RegExp` value representing a well-formatted [regular expression](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions). The values `null` and `""` map to `null`. A `RegExp` value is used as-is. Any other values are subject to string coercion (`value+''`) and then interpreted as properly-escaped regular expression strings.

<a name="string" href="#string">#</a> <b>String</b>

A `String` value. The values `null` and `""` map to `null`. Any other values are subject to string coercion (`value + ''`).

### Aggregate Operations

Aggregate operations that can be used as entries of the _measure_ parameter of the [aggregate](#aggregate), [joinaggregate](#joinaggregate), and [window](#window) transforms. For each operation, the _as_ method call is optional.

<a name="count" href="#count">#</a>
df.<b>count</b>().as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The total count of data objects in an aggregation group.

<a name="valid" href="#valid">#</a>
df.<b>valid</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The count of field values that are not `null`, `undefined`, or `NaN`.

<a name="missing" href="#missing">#</a>
df.<b>missing</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The count of `null` or `undefined` field values.

<a name="distinct" href="#distinct">#</a>
df.<b>distinct</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The count of distinct field values.

<a name="sum" href="#sum">#</a>
df.<b>sum</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The sum of field values.

<a name="mean" href="#mean">#</a>
df.<b>mean</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The mean (average) field value.

<a name="average" href="#average">#</a>
df.<b>average</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The mean (average) field value. Identical to [mean](#mean).

<a name="variance" href="#variance">#</a>
df.<b>variance</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The sample variance of field values.

<a name="variancep" href="#variancep">#</a>
df.<b>variancep</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The population variance of field values.

<a name="stdev" href="#stdev">#</a>
df.<b>stdev</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The sample standard deviation of field values.

<a name="stdevp" href="#stdevp">#</a>
df.<b>stdevp</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The population standard deviation of field values.

<a name="stderr" href="#stderr">#</a>
df.<b>stderr</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The standard error of field values.

<a name="median" href="#median">#</a>
df.<b>median</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The median field value.

<a name="q1" href="#q1">#</a>
df.<b>q1</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The lower quartile boundary of field values.

<a name="q3" href="#q3">#</a>
df.<b>q3</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The upper quartile boundary of field values.

<a name="ci0" href="#ci0">#</a>
df.<b>ci0</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The lower boundary of the bootstrapped 95% confidence interval of the mean field value.

<a name="ci1" href="#ci1">#</a>
df.<b>ci1</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The upper boundary of the bootstrapped 95% confidence interval of the mean field value.

<a name="min" href="#min">#</a>
df.<b>min</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The minimum field value.

<a name="max" href="#max">#</a>
df.<b>max</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

The maximum field value.

<a name="argmin" href="#argmin">#</a>
df.<b>argmin</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

An input data object containing the minimum field value.

<a name="argmax" href="#argmax">#</a>
df.<b>argmax</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

An input data object containing the maximum field value.

### Window Operations

Window operations that can be used as entries of the _measure_ parameter of the [window](#window) transform. For each operation, the _as_ method call is optional.

<a name="row_number" href="#row_number">#</a>
df.<b>row_number</b>().as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

Assigns each data object a consecutive row number, starting from 1.

<a name="rank" href="#rank">#</a>
df.<b>rank</b>().as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

Assigns a rank order value to each data object in a window, starting from 1. Peer values are assigned the same rank. Subsequent rank scores incorporate the number of prior values. For example, if the first two values tie for rank 1, the third value is assigned rank 3.

<a name="dense_rank" href="#dense_rank">#</a>
df.<b>dense_rank</b>().as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

Assigns dense rank order values to each data object in a window, starting from 1. Peer values are assigned the same rank. Subsequent rank scores do not incorporate the number of prior values. For example, if the first two values tie for rank 1, the third value is assigned rank 2.

<a name="percent_rank" href="#percent_rank">#</a>
df.<b>percent_rank</b>().as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

Assigns a percentage rank order value to each data object in a window. The percent is calculated as _(rank - 1) / (group_size - 1)_.

<a name="cume_dist" href="#cume_dist">#</a>
df.<b>cume_dist</b>().as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

Assigns a cumulative distribution value between 0 and 1 to each data object in a window.

<a name="ntile" href="#ntile">#</a>
df.<b>ntile</b>(<em>parameter</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

Assigns a quantile (e.g., percentile) value to each data object in a window. Accepts an integer _parameter_ indicating the number of buckets to use (e.g., 100 for percentiles, 5 for quintiles).

<a name="lag" href="#lag">#</a>
df.<b>lag</b>(<em>field</em>[, <em>parameter</em>]).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

Assigns the value of _field_ from the data object that precedes the current object by a specified number of positions. If no such object exists, assigns `null`. Accepts an offset _parameter_ (default `1`) that indicates the number of positions.

<a name="lead" href="#lead">#</a>
df.<b>lead</b>(<em>field</em>[, <em>parameter</em>]).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

Assigns the value of _field_ from the data object that follows the current object by a specified number of positions. If no such object exists, assigns `null`. Accepts an offset _parameter_ (default `1`) that indicates the number of positions.

<a name="first_value" href="#first_value">#</a>
df.<b>first_value</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

Assigns the value of _field_ from the first data object in the current sliding window frame.

<a name="last_value" href="#last_value">#</a>
df.<b>last_value</b>(<em>field</em>).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

Assigns the value of _field_ from the last data object in the current sliding window frame.

<a name="nth_value" href="#nth_value">#</a>
df.<b>nth_value</b>(<em>field</em>[, <em>parameter</em>]).as(<em>name</em>)
[<>](https://github.com/vega/dataflow-api/blob/master/src/ops.js "Source")

Assigns the value of _field_ from the _nth_ data object in the current sliding window frame. If no such object exists, assigns `null`. Requires a non-negative integer _parameter_ that indicates the offset from the start of the window frame.
