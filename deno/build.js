// @todo: Build a watcher for this script.

import * as colors                                  from "jsr:@std/fmt@1.0.8/colors";
import {encodeHex}                                  from "jsr:@std/encoding@1.0.10";
import {emptyDir, expandGlob}                       from "jsr:@std/fs@1.0.21";
import {basename, dirname, extname, join, relative} from "jsr:@std/path@1.1.4";

import {minify as htmlmin} from "npm:html-minifier@4.0.0";

// esbuild and plugins:
import * as esbuild from "https://deno.land/x/esbuild@v0.27.2/mod.js";

// PostCSS and plugins:
import postcss             from "npm:postcss@8.5.6";
import postcssAutoprefixer from "npm:autoprefixer@10.4.23";
import postcssImport       from "npm:postcss-import@16.1.1";
import postcssInlineSvg    from "npm:postcss-inline-svg@6.0.0";
import postcssMinify       from "npm:postcss-minify@1.2.0";

import template from "./lib/template.js";

const LOCALE =               Deno.env.get("LOCALE");
const DEBUG =                Boolean(Number(Deno.env.get("DEBUG")));
const PAYMENT_MODE_INVOICE = Boolean(Number(Deno.env.get("PAYMENT_MODE_INVOICE")));


const PUBLIC_DIR =    Deno.env.get("PUBLIC_DIR")    ?? "./public";
const ASSETS_DIR =    Deno.env.get("ASSETS_DIR")    ?? "./assets";
const TEMPLATES_DIR = Deno.env.get("TEMPLATES_DIR") ?? "./templates";
const INCLUDES_DIR =  Deno.env.get("INCLUDES_DIR");

// ⚠️ These variables are publicly exposed!
const publicEnv = {DEBUG, LOCALE, PAYMENT_MODE_INVOICE};

const esbuildOptions = {
	format:    "esm",
	sourcemap: "external",
	external:  ["@whizzo-js/*"],
	bundle:    true,
	keepNames: true,
	write:     false,
	minify:    !DEBUG
};

const postcssPlugins = [postcssImport, postcssAutoprefixer, postcssInlineSvg, postcssMinify];
const postcssOptions = {map: {inline: false, annotation: false}};

const htmlminOptions = {
	collapseWhitespace: true,
	removeComments:     true
};

const getPaths = async function*(sourceDir, pattern, destDir, destExt, exclude=["**/_*", "**/_*/**"]) {
	for await (const {path} of expandGlob(pattern, {root: sourceDir, includeDirs: false, exclude })) {
		const sourceExt = extname(path);
		const destFilename = basename(path, sourceExt) + (destExt ?? sourceExt);
		yield [
			relative(".", path),
			join(destDir, relative(sourceDir, dirname(path)), destFilename)
		];
	}
};

const getFingerprint = async content => {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(content));
	return encodeHex(digest.slice(0, 4));
};

// Build bundled, minified and fingerprinted JavaScript assets and their sourcemaps:
const buildScriptAssets = async () => {
	const paths = getPaths(ASSETS_DIR, "script/**/bundle.js", join(PUBLIC_DIR, "assets"), ".__fingerprint__.min.js");
	for await (const [sourcePath, destPath] of paths) {
		console.log(` ${colors.dim("├─")} ${colors.blue(sourcePath)}`);
		const result = await esbuild.build({entryPoints: [sourcePath], outfile: destPath, ...esbuildOptions});
		const files = result.outputFiles.reduce((files_, file) => {
			files_[file.path.split(".").pop()] = file;
			return files_;
		}, {});
		const path = destPath.replace("__fingerprint__", await getFingerprint(files.js.text));
		const comment = `//# sourceMappingURL=${basename(path)}.map\n`;
		await Deno.mkdir(dirname(path), {recursive: true});
		Deno.writeTextFile(path, files.js.text + comment, {create: true})
		Deno.writeTextFile(`${path}.map`, files.map.text, {create: true})
	}
	esbuild.stop();
};

// Build bundled, minified and fingerprinted CSS assets:
const buildStyleAssets = async () => {
	const paths = getPaths(ASSETS_DIR, "styles/**/bundle.css", join(PUBLIC_DIR, "assets"), ".__fingerprint__.min.css");
	for await (const [sourcePath, destPath] of paths) {
		console.log(` ${colors.dim("├─")} ${colors.blue(sourcePath)}`);
		const content = await Deno.readTextFile(sourcePath);
		const result = await postcss(postcssPlugins).process(content, {from: sourcePath, to: destPath, ...postcssOptions});
		const path = destPath.replace("__fingerprint__", await getFingerprint(result.css));
		const comment = `/*# sourceMappingURL=${basename(path)}.map*/\n`;
		await Deno.mkdir(dirname(destPath), {recursive: true});
		Deno.writeTextFile(path, result.css + comment, {create: true});
		Deno.writeTextFile(`${path}.map`, result.map, {create: true});
	}
};

// Copy other assets:
const copyAssets = async () => {
	const paths = getPaths(ASSETS_DIR, "{data,fonts,images}/**/*", join(PUBLIC_DIR, "assets"));
	for await (const [sourcePath, destPath] of paths) {
		console.log(` ${colors.dim("├─")} ${colors.blue(sourcePath)}`);
		await Deno.mkdir(dirname(destPath), {recursive: true});
		Deno.copyFile(sourcePath, destPath);
	}
};

// Copy common and environment-specific includes:
const copyIncludes = async () => {
	for(const paths of [
		// Do not exclude files with names that start with an underscore here, like _headers, _redirects and _routes.json:
		getPaths("./includes", "**/*", PUBLIC_DIR, undefined, ["**/_*/**"]),
		getPaths(INCLUDES_DIR, "**/*", PUBLIC_DIR, undefined, ["**/_*/**"])
	]) {
		for await (const [sourcePath, destPath] of paths) {
			console.log(` ${colors.dim("├─")} ${colors.blue(sourcePath)}`);
			await Deno.mkdir(dirname(destPath), {recursive: true});
			Deno.copyFile(sourcePath, destPath);
		}
	}
};

// Render templates as HTML:
const renderTemplates = async () => {
	const paths = getPaths(TEMPLATES_DIR, "**/*.vto", PUBLIC_DIR, ".html");
	for await (const [sourcePath, destPath] of paths) {
		console.log(` ${colors.dim("├─")} ${colors.blue(sourcePath)}`);
		const content = `${htmlmin((await template.run(sourcePath, {env: publicEnv})).content, htmlminOptions)}\n`;
		await Deno.mkdir(dirname(destPath), {recursive: true});
		Deno.writeTextFile(destPath, content, {create: true});
	}
};

if(import.meta.main) {

	const time = async (label, callback) => {
		const start = performance.now();
		const result = await callback();
		return {label, duration: Math.round(performance.now() - start), result};
	};

	const keys = Object.keys(publicEnv);

	console.log(`\nExposed environment ⚠️\n${colors.dim("─┬─────────────────")}`);
	keys.forEach((key, i) => console.log(` ${colors.dim(i < keys.length - 1 ? "├─" : "└─")} ${colors.red(key)}`));

	console.log(`\nBuild started →\n${colors.dim("─┬───────────")}`);
	const start = performance.now();
	const timing = [
		await time("Empty output folder", () => emptyDir(PUBLIC_DIR)),
		await Promise.all([
			time("Build script assets", buildScriptAssets),
			time("Build style assets",  buildStyleAssets)
		]),
		await Promise.all([
			time("Copy assets", copyAssets),
			time("Copy includes", copyIncludes),
			time("Render templates", renderTemplates)
		])
	];

	const duration = Math.round(performance.now() - start);
	console.log(`${colors.dim(" │\n └─")} ${colors.green("Build completed ✔︎")} ${colors.dim(`in ${duration} ms`)}`);
	console.log(colors.dim(`    ─┬─────────────`));
	timing.flat().forEach(({label, duration}, i, timing) => {
		console.log(
			`     ${colors.dim(i < timing.length - 1 ? "├─" : "└─")} ${colors.green(label)} ${colors.dim(`in ${duration} ms`)}`
		);
	});
	console.log();

}
