/* global Deno */

import vento from "npm:ventojs@2.3.1";

import {toLocaleDateString, toLocaleNumberString, toLocaleTimeString} from "./format.js";

const LOCALE = Deno.env.get("LOCALE");

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
	formatInteger: value => filters.formatNumber(value, "integer"),
	formatFloat:   value => filters.formatNumber(value, "float"),
	formatAmount:  value => filters.formatNumber(value, "amount"),
	formatPercent: value => filters.formatNumber(value * 100, "integer") + "%"
});

const env = vento();
Object.assign(env.filters, filters);

export default env;
