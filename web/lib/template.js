// @todo: Investigate performance impact of doing one .querySelectorAll() for all attrs, instead of once per attr.

import formats from "./format.js";

// Prototype extension to make XPathResult iterable:
// Source: https://www.anycodings.com/1questions/1320706/how-to-use-arrayfrom-with-a-xpathresult
XPathResult.prototype[Symbol.iterator] = function* () {
	switch(this.resultType) {
		case XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
		case XPathResult.ORDERED_NODE_ITERATOR_TYPE:
			let result;
			while(result = this.iterateNext()) {
				yield result;
			}
			break;
		case XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
		case XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
			for(let i=0; i < this.snapshotLength; i++) {
				yield this.snapshotItem(i);
			}
			break;
		default:
			yield this.singleNodeValue;
			break;
	}
};

const filters = {

	encodeURI,
	encodeURIComponent,

	min:   Math.min,
	max:   Math.max,
	round: Math.round,
	floor: Math.floor,
	ceil:  Math.ceil,
	trunc: Math.trunc,

	toString: value => value.toString(),
	toJSON:   (value, space) => JSON.stringify(value, undefined, space),
	fromJSON: JSON.parse,

	isTruthy: value => !!value,
	isFalsy:  value => !value,
	ternary:  (value, yep, nope) => !!value ? yep : nope,

	is:        (a, b) => a == b,
	isNot:     (a, b) => a != b,
	isMore:    (a, b) => a > b,
	isLess:    (a, b) => a < b,
	isAtMost:  (a, b) => a <= b,
	isAtLeast: (a, b) => a >= b,
	isInRange: (value, min, max) => value >= min && value <= max,

	isLastIndex:        (index, length) => index == length - 1,
	isFirstIndexOfMore: (index, length) => index == 0 && length > 1,
	isLastIndexOfMore:  (index, length) => index == length - 1 && length > 1,

	isNull:    value => value == null,
	isNotNull: value => value != null,

	and:      (a, b) => a && b,
	or:       (a, b) => a || b,
	coalesce: (a, b) => a ?? b,

	add:      (...values) => values.reduce((a, b) => a + b),
	subtract: (...values) => values.reduce((a, b) => a - b),
	multiply: (...values) => values.reduce((a, b) => a * b),
	divide:   (...values) => values.reduce((a, b) => a / b),

	length:    value => value.length,
	includes:  (value, target)    => value.includes(target),
	item:      (value, index)     => value[index],
	split:     (value, delimiter) => value.split(delimiter),
	slice:     (value, ...args)   => value.slice(...args),
	join:      (value, delimiter) => value.join(delimiter),

	toUpperCase: value => value.toUpperCase(),
	toLowerCase: value => value.toLowerCase(),
	toSingular:  value => value.replace(/{{.+?}}/g, ""),
	toPlural:    value => value.replace(/{{|}}/g, ""),

	startsWith: (value, prefix) =>  value?.startsWith(prefix),
	endsWith:   (value, suffix) =>  value?.endsWith(suffix),
	matches:    (value, pattern) => RegExp(pattern).test(value),
	replace:    (value, a, b, regExp=false) => value.replace(regExp ? RegExp(a) : a, b),

	formatNumber: (value, format="integer") => Number(value).toLocaleString(window.LOCALE, formats.number[format]),
	formatDate:   (value, format="short")   => new Date(value).toLocaleDateString(window.LOCALE, formats.date[format]),
	formatTime:   (value, format="short")   => new Date(value).toLocaleTimeString(window.LOCALE, formats.time[format]),

	toDisplayName: (value, type) => new Intl.DisplayNames(window.LOCALE, {type}).of(value),

	toRelativeTime: value => {
		const limits = [60, 3_600, 86_400, 86_400 * 7, 86_400 * 30, 86_400 * 365, Infinity]; // Minutes, hours, days, weeks, months, years...
		const delta = Math.round((value.getTime() - Date.now()) / 1_000);
		const index = limits.findIndex(limit => limit > Math.abs(delta));
		const unit = ["second", "minute", "hour", "day", "week", "month", "year"][index];
		return new Intl.RelativeTimeFormat(window.LOCALE, {numeric: "auto"})
		.format(Math.floor(delta / (limits[index - 1] ?? 1)), unit);
	}

};

Object.assign(filters, {
	formatInteger: (...args) => filters.formatNumber(...args, "integer"),
	formatFloat:   (...args) => filters.formatNumber(...args, "float"),
	formatAmount:  (...args) => filters.formatNumber(...args, "amount"),
});

const parse = (expression, context) => {
	const [valueExpr, ...filters_] = expression.trim().split(/\s*\|\s*/);
	const value = evaluate(valueExpr, context);
	return filters_.reduce(
		(result, filter) => {
			const [name, ...args] = filter.match(/(?:[^\s"']+|["'][^"']*["'])+/g);
			if(!(name in filters)) {
				throw `Template filter ${name} does not exist.`
			}
			return filters[name](result, ...args.map(argumentExpr => evaluate(argumentExpr, context)));
		},
		value
	);
};

const evaluate = (expression, context) => {

	// String, number or boolean value:
	if(/^['"].*['"]$/.test(expression)) {             return expression.slice(1, -1).replace(/\\n/g, "\n"); }
	if(/^\-?(\d+(\.\d*)?|\.\d+)$/.test(expression)) { return JSON.parse(expression); }
	if(["true", "false"].includes(expression)) {      return JSON.parse(expression); }

	// Context path value:
	return expression.replace(/\[(\d+)\]/g, ".$1").split(".").reduce((obj, key) => obj && obj[key], context);

};

export default class Template {

	static fromString(template) {
		return new this({content: document.createRange().createContextualFragment(template)}, false);
	}

	constructor(template, remove=true) {
		this.template = template;
		this.root = document.implementation.createHTMLDocument().body;
		remove && template.remove();
		return (target, context, action)  => this.render(target, context, action);
	}

	getElements(key) {
		return Array.from(this.root.querySelectorAll(`[\\${key}]`))
		.reverse()
		.map(element => [element, element.getAttributeNode(key)]);
	}

	getContext(element) {
		const contexts = [];
		while(element != this.root) {
			this.contexts.has(element) && contexts.push(this.contexts.get(element));
			element = element.parentElement;
		};
		contexts.reverse();
		return Object.assign(this.context, ...contexts);
	}

	setContext(element, context) {
		this.contexts.set(element, {...this.contexts.get(element), ...context});
	}

	render(target, context, action="replaceChildren") {
		return new Promise((resolve, reject) => {

			let tree;

			this.contexts = new WeakMap();
			this.context = structuredClone(context);
			Object.defineProperty(this.context, "window", {get: () => window});
			Object.defineProperty(this.context, "$root",  {get: () => this.context});

			this.root.replaceChildren(this.root.ownerDocument.importNode(this.template.content, true));

			// <div $for="key of valueExpr">:
			let element;
			do {
				element = this.root.querySelector("[\\$for]");
				if(element != null) {
					const attr = element.removeAttributeNode(element.getAttributeNode("$for"));
					const [key, valueExpr] = attr.value.split(/\sof\s/);
					const value = parse(valueExpr, this.getContext(element));
					const entries = Array.isArray(value) ? Array.from(value.entries()) : Object.entries(value);
					entries.forEach(([key_, value], i) => {
						const element_ = element.cloneNode(true);
						this.setContext(element_, {
							[key]:    value,
							$key:     key_,
							$index:   i,
							$ordinal: i + 1,
							$length:  entries.length
						});
						element.before(element_);
					});
					element.remove();
				}
			}
			while(element != null);

			// <div $set="key = valueExpr">:
			for(const [element, attr] of this.getElements("$set")) {
				const [key, valueExpr] = attr.value.split(/\s?=\s?/);
				this.setContext(element, {[key]: parse(valueExpr, this.getContext(element))});
				element.removeAttributeNode(attr);
			};

			// <div $if="conditionExpr">:
			for(const [element, attr] of this.getElements("$if")) {
				!parse(attr.value, this.getContext(element)) && element.remove();
				element.removeAttributeNode(attr);
			};

			// <div foo="${valueExpr}">:
			Array.from(new XPathEvaluator().evaluate('.//*/@*[contains(., "${")]', this.root))
			.forEach(attr => {
				const context = this.getContext(attr.ownerElement);
				attr.value = attr.value.replace(/\${\s*(.+?)\s*}/g, (match, value) => parse(value, context));
			});

			// <div $attr-if="key: conditionExpr">:
			for(const [element, attr] of this.getElements("$attr-if")) {
				const [key, conditionExpr] = attr.value.split(/\s?:\s?/);
				!!parse(conditionExpr, this.getContext(element)) && element.setAttribute(key, "");
				element.removeAttributeNode(attr);
			};

			// <div>${valueExpr}</div>:
			tree = document.createTreeWalker(this.root, NodeFilter.SHOW_TEXT, node => node.textContent.includes("${"));
			while(tree.nextNode()) {
				const node = tree.currentNode;
				const context = this.getContext(node.parentElement);
				node.textContent = node.textContent.replace(/\${\s*(.+?)\s*}/g, (match, value) => parse(value, context));
			}

			// <div $collapse>:
			for(const [element] of this.getElements("$collapse")) {
				element.replaceChildren(
					...Array.from(element.childNodes)
					.filter(node => node.nodeType != Node.TEXT_NODE || /\S/.test(node.textContent))
				);
			}

			// <content>:
			for(let element of Array.from(this.root.getElementsByTagName("content"))) {
				element.replaceWith(...element.childNodes);
			}

			// <text>:
			for(let element of Array.from(this.root.getElementsByTagName("text"))) {
				element.replaceWith(element.textContent);
			}

			this.root.normalize();
			switch(action) {

				case "replaceChildren": target.replaceChildren(...this.root.childNodes); break;
				case "replaceWith":     target.replaceWith(    ...this.root.childNodes); break;
				case "prepend":         target.prepend(        ...this.root.childNodes); break;
				case "append":          target.append(         ...this.root.childNodes); break;

				case "setValue":
					target.value = this.root.innerHTML;
					break;

			}

			target.dispatchEvent(new Event("render", {bubbles: true}));
			resolve();

		});
	}

};
