import node from "rollup-plugin-node-resolve";

export default {
  input: "index",
  external: ['vega-loader'],
  globals: {'vega-loader': 'vega'},
  plugins: [node()],
  output: {
    file: "build/dataflow-api.js",
    format: "umd",
    name: "df"
  }
};