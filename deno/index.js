import {expandGlob}                from "jsr:@std/fs@1.0.21";
import {dirname, parse}            from "jsr:@std/path@1.1.4";
import {TextLineStream}            from "jsr:@std/streams@1.0.16";
import {toCamelCase, toPascalCase} from "jsr:@std/text@1.0.16";

const getPaths = async function*(sourceDir, pattern, exclude=true) {
	const options = {
		root:        sourceDir,
		exclude:     exclude ? ["**/_*.*", "**/_*/**"] : undefined,
		includeDirs: false
	};
	for await (const {path} of expandGlob(pattern, options)) {
		yield path;
	}
};

const readFirstLine = async (path) => {
	const file = await Deno.open(path);
	const lines = file.readable.pipeThrough(new TextDecoderStream()).pipeThrough(new TextLineStream());
	for await (const line of lines) {
		return line;
	}
};

async function updateIndexFiles(pattern="**/__index__.*") {
	const paths = getPaths("./", pattern, false);
	for await (const sourcePath of paths) {
		const preamble = await readFirstLine(sourcePath);
		const template = preamble.match(/@template ?: ?["'`](?<template>.+)["'`]/)?.groups.template;
		const paths_ = getPaths(dirname(sourcePath), "*");
		const content = (await Array.fromAsync(paths_)).map(path => {
			const context = parse(path);
			context.path = path;
			context.name = {
				toString:     () => context.name,
				toCamelCase:  toCamelCase(context.name),
				toPascalCase: toPascalCase(context.name)
			};
			return new Function("file", `return \`${template}\`;`)(context);
		});
		await Deno.writeTextFile(sourcePath, [preamble, "", content, ""].flat().join("\n"));
	}
};

if(import.meta.main) {
	// @todo: Add fancy console logging.
	await updateIndexFiles();
	console.log("✔︎ Index files updated\n");
}
