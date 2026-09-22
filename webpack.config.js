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
        /* 集市解压会保留条目 mtime：固定纪元（1980）会让装机文件比用户云同步的任何文件都旧，
           WebDAV 按时间戳比对即判定"云端较新"→ 下载旧版覆盖 → 已安装版本回退
           （速切 0.23.1 实故）。改用真实构建时间：装机 mtime 永远新鲜，同步方向正确。
           代价是 zip 摘要逐次构建不同——发版说明摘要以 sync:digest 同步为准。 */
        const buildTime = new Date();
        zip.outputStream.on("data", (chunk) => chunks.push(chunk));
        zip.outputStream.on("end", () => resolve(Buffer.concat(chunks)));
        zip.outputStream.on("error", reject);
        entries.forEach((entry) => zip.addBuffer(Buffer.from(entry.content), entry.name, {mtime: buildTime}));
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
                {from: "i18n", to: "./dist/i18n"},
                {from: pluginManifest.icon, to: `./dist/${pluginManifest.icon}`},
                ...(pluginManifest.preview ? [{from: pluginManifest.preview, to: `./dist/${pluginManifest.preview}`}] : []),
            ] : [
                {from: pluginManifest.icon, to: `./${pluginManifest.icon}`},
                ...(pluginManifest.preview ? [{from: pluginManifest.preview, to: `./${pluginManifest.preview}`}] : []),
            ],
        }),
    ];

    if (production) {
        plugins.push(
            new webpack.BannerPlugin({
                banner: fs.existsSync("LICENSE") ? fs.readFileSync("LICENSE").toString() : "小驴打卡",
                // Keep the full license banner on executable output only. The
                // package already ships LICENSE.txt, so duplicating it in CSS
                // needlessly adds about 1 KiB to every build.
                include: /\.js$/,
            }),
        );
        // Validation builds share production output without creating an installable archive.
        if (!env?.noPackage) plugins.push(new PackageZipPlugin());
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
            /* The extracted stylesheet is the largest release asset.  Sass
               already emits compressed CSS, but css-loader still preserves
               selector/value whitespace and duplicate-safe formatting.  The
               existing esbuild minimizer can process CSS assets as well;
               enabling it here keeps the hard release budget meaningful
               without changing source-level cascade or layout semantics. */
            minimizer: [new EsbuildPlugin({css: production})],
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
                        {
                            loader: "sass-loader",
                            options: {
                                /* Production CSS is shipped as a single asset. Sass's
                                   compressed emitter removes comments/whitespace without
                                   changing selectors or runtime layout, keeping the release
                                   budget focused on actual UI rules. Development stays
                                   expanded so visual debugging remains readable. */
                                sassOptions: {outputStyle: production ? "compressed" : "expanded"},
                            },
                        },
                    ],
                },
            ],
        },
        plugins,
    };
};
