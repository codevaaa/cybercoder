import esbuild from 'esbuild'

const production = process.argv.includes('--production')
const watch = process.argv.includes('--watch')

/** Bundle the extension host code. `vscode` is provided by the runtime. */
const ctx = await esbuild.context({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  outfile: 'dist/extension.js',
  external: ['vscode'],
  sourcemap: !production,
  minify: production,
  logLevel: 'info',
})

if (watch) {
  await ctx.watch()
} else {
  await ctx.rebuild()
  await ctx.dispose()
}
