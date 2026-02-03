import {expandGlob} from "jsr:@std/fs@1.0.21";
import {relative}   from "jsr:@std/path@1.1.4";
import vento        from "jsr:@vento/vento@1.14.0"; // @todo: Upgrade to latest NPM package.

import {toLocaleDateString, toLocaleNumberString, toLocaleTimeString} from "./format.js";

const LOCALE =     Deno.env.get("LOCALE");
const PUBLIC_DIR = Deno.env.get("PUBLIC_DIR") ?? "./public";

// Lil' bag o' utilities:
const filters = {

	toSingular: value => value.replace(/{{.+?}}/g, ""),
	toPlural:   value => value.replace(/{{|}}/g, ""),

	isLastIndex:        (index, iterable) => index == iterable.length - 1,
	isLastIndexOfMore:  (index, iterable) => index == iterable.length - 1 && iterable.length > 1,
	isFirstIndexOfMore: (index, iterable) => index == 0 && iterable.length > 1,

	formatNumber: (value, format) => toLocaleNumberString(value, format),
	formatDate:   (value, format) => toLocaleDateString(value, format),
	formatTime:   (value, format) => toLocaleTimeString(value, format),

	toDisplayName: (value, type) => new Intl.DisplayNames(LOCALE, {type}).of(value),

	resolvePath: async (glob, root=PUBLIC_DIR) => {
		const entry = await expandGlob(glob, {root, includeDirs: false}).next();
		if(entry.value != null) {
			return `/${relative(root, entry.value.path)}`;
		}
	}

};

Object.assign(filters, {
	formatInteger: (...args) => filters.formatNumber(...args, "integer"),
	formatFloat:   (...args) => filters.formatNumber(...args, "float"),
	formatAmount:  (...args) => filters.formatNumber(...args, "amount"),
});

const env = vento();
Object.assign(env.filters, filters);

export default env;
