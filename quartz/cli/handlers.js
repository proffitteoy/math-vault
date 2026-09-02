import { promises as fs } from "node:fs"
import path from "node:path"
import { randomUUID } from "node:crypto"
import { styleText } from "node:util"
import esbuild from "esbuild"
import { sassPlugin } from "esbuild-sass-plugin"

import { cacheFile, fp, version } from "./constants.js"

export async function handleBuild(argv) {
  console.log(`\n${styleText(["bgGreen", "black"], ` Notes v${version} `)} \n`)

  await esbuild.build({
    entryPoints: [fp],
    outfile: cacheFile,
    bundle: true,
    keepNames: true,
    minifyWhitespace: true,
    minifySyntax: true,
    platform: "node",
    format: "esm",
    jsx: "automatic",
    jsxImportSource: "preact",
    packages: "external",
    sourcemap: true,
    sourcesContent: false,
    plugins: [
      sassPlugin({
        type: "css-text",
        cssImports: true,
      }),
      sassPlugin({
        filter: /\.inline\.scss$/,
        type: "css",
        cssImports: true,
      }),
      {
        name: "inline-script-loader",
        setup(build) {
          build.onLoad({ filter: /\.inline\.(ts|js)$/ }, async (args) => {
            let source = await fs.readFile(args.path, "utf8")
            source = source.replace("export default", "").replace("export", "")
            const sourcefile = path.relative(path.resolve("."), args.path)
            const transpiled = await esbuild.build({
              stdin: {
                contents: source,
                loader: "ts",
                resolveDir: path.dirname(sourcefile),
                sourcefile,
              },
              write: false,
              bundle: true,
              minify: true,
              platform: "browser",
              format: "esm",
            })
            return { contents: transpiled.outputFiles[0].text, loader: "text" }
          })
        },
      },
    ],
  })

  const { default: buildNotes } = await import(`../../${cacheFile}?update=${randomUUID()}`)
  await buildNotes(argv)
}
