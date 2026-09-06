const fs = require("node:fs");
const path = require("node:path");
const webpack = require("webpack");

const output = path.join(__dirname, "dist");
fs.mkdirSync(output, {recursive: true});
for (const name of ["index.html", "styles.css"]) {
    fs.copyFileSync(path.join(__dirname, name), path.join(output, name));
}
fs.copyFileSync(path.join(__dirname, "../../icon.svg"), path.join(output, "icon.svg"));
fs.copyFileSync(require.resolve("lucide/LICENSE"), path.join(output, "lucide-LICENSE.txt"));
const compiler = webpack({
    mode: "production",
    context: __dirname,
    entry: "./app.js",
    output: {path: output, filename: "app.js"},
    resolve: {extensions: [".ts", ".js"], alias: {lucide: require.resolve("lucide")}},
    module: {rules: [{test: /\.ts$/, use: [{loader: require.resolve("esbuild-loader"), options: {target: "es2020"}}]}]},
    performance: {hints: false},
});
compiler.run((error, stats) => {
    compiler.close(() => {});
    if (error || stats.hasErrors()) {
        console.error(error || stats.toString({all: false, errors: true}));
        process.exitCode = 1;
        return;
    }
    console.log(stats.toString({all: false, assets: true, timings: true}));
    console.log(`Preview: ${path.join(output, "index.html")}`);
});
