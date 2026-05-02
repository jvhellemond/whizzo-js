import vento from "https://cdn.jsdelivr.net/gh/ventojs/vento@2.2.0/mod.ts";

import {toLocaleDateString, toLocaleNumberString, toLocaleTimeString} from "./format.js";

const LOCALE =     Deno.env.get("LOCALE");

// Lil' bag o' utilities:
const filters = {

	toSingular: value => value.replace(/{{.+?}}/g, ""),
	toPlural:   value => value.replace(/{{|}}/g, ""),

	isFirstIndexOfMore: (index, length) => index == 0 && length > 1,
	isLastIndexOfMore:  (index, length) => index == length - 1 && length > 1,
	isLastIndex:        (index, length) => index == length - 1,

	formatNumber: (value, format) => toLocaleNumberString(value, format),
	formatDate:   (value, format) => toLocaleDateString(value, format),
	formatTime:   (value, format) => toLocaleTimeString(value, format),

	toDisplayName: (value, type) => new Intl.DisplayNames(LOCALE, {type}).of(value),

};

Object.assign(filters, {
	formatInteger: (...args) => filters.formatNumber(...args, "integer"),
	formatFloat:   (...args) => filters.formatNumber(...args, "float"),
	formatAmount:  (...args) => filters.formatNumber(...args, "amount"),
});

const env = vento();
Object.assign(env.filters, filters);

export default env;
