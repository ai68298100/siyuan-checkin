const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const {EsbuildPlugin} = require("esbuild-loader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const yazl = require("yazl");
const pluginManifest = require("./plugin.json");

class PackageZipPlugin {
    apply(compiler) {
        compiler.hooks.thisCompilation.tap("PackageZipPlugin", (compilation) => {
            compilation.hooks.processAssets.tapPromise(
                {
                    name: "PackageZipPlugin",
                    stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT,
                },
                async () => {
                    const entries = compilation.getAssets()
                        .filter((asset) => asset.name.startsWith("dist/"))
                        .sort((left, right) => left.name.localeCompare(right.name));
                    const archive = await createZip(entries.map((asset) => ({
                        name: asset.name.slice("dist/".length),
                        content: asset.source.source(),
                    })));
                    compilation.emitAsset("package.zip", new webpack.sources.RawSource(archive));
                },
            );
        });
    }
}

function createZip(entries) {
    return new Promise((resolve, reject) => {
        const zip = new yazl.ZipFile();
        const chunks = [];
        zip.outputStream.on("data", (chunk) => chunks.push(chunk));
        zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
        zip.outputStream.on("error", reject);
        entries.forEach((entry) => zip.addBuffer(Buffer.from(entry.content), entry.name));
        zip.end();
    });
}

module.exports = (env, argv) => {
    const production = argv.mode === "production";
    const plugins = [
        new MiniCssExtractPlugin({
            filename: production ? "dist/index.css" : "index.css",
        }),
        new CopyPlugin({
            patterns: production ? [
                {from: "plugin.json", to: "./dist/plugin.json"},
                {from: "README.md", to: "./dist/README.md"},
                {from: "LICENSE", to: "./dist/LICENSE.txt"},
                {from: pluginManifest.icon, to: `./dist/${pluginManifest.icon}`},
            ] : [
                {from: pluginManifest.icon, to: `./${pluginManifest.icon}`},
            ],
        }),
    ];

    if (production) {
        plugins.push(
            new webpack.BannerPlugin({
                banner: fs.existsSync("LICENSE") ? fs.readFileSync("LICENSE").toString() : "小驴打卡",
            }),
            new PackageZipPlugin(),
        );
    }

    return {
        mode: argv.mode || "development",
        watch: false,
        devtool: production ? false : "eval-source-map",
        output: {
            filename: production ? "dist/index.js" : "index.js",
            path: path.resolve(__dirname),
            libraryTarget: "commonjs2",
            library: {type: "commonjs2"},
        },
        externals: {
            siyuan: "siyuan",
        },
        entry: "./src/index.ts",
        optimization: {
            minimize: production,
            minimizer: [new EsbuildPlugin()],
        },
        resolve: {
            extensions: [".ts", ".scss", ".js", ".json"],
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    include: [path.resolve(__dirname, "src")],
                    use: [{loader: "esbuild-loader", options: {target: "es2020"}}],
                },
                {
                    test: /\.scss$/,
                    include: [path.resolve(__dirname, "src")],
                    use: [
                        MiniCssExtractPlugin.loader,
                        "css-loader",
                        "sass-loader",
                    ],
                },
            ],
        },
        plugins,
    };
};
