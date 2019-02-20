import node from "rollup-plugin-node-resolve";

export default {
  input: "index",
  plugins: [node()],
  output: {
    file: "build/dataflow-api.js",
    format: "umd",
    name: "df"
  }
};