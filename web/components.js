import * as constructors from "./components/__index__.js";

// Object deep assignment helper:
Object.setAtPath = function (obj, path, value) {
	const keys = path.replace(/\[(\d+)\]/g, ".$1").split(".");
	const key = keys.pop();
	const obj_ = keys.reduce((obj_, key_) => obj_ = obj_[key_] ?? (obj_[key_] = {}), obj);
	obj_[key] = value;
};

const components = new WeakMap();
Object.defineProperty(HTMLElement.prototype, "component", {
	get: function () {
		return components.get(this);
	}
});

const instantiate = () => {
	for(const $ of Array.from(document.querySelectorAll("[\\@]")).reverse()) {
		// Parse constructor key and instance alias:
		const attr = $.removeAttributeNode($.getAttributeNode("@"));
		const [key, alias=attr.value.toLowerCase()] = attr.value.split(/\sas\s/);
		if(!(key in constructors)) {
			throw `Component constructor ${key} does not exist.`;
		}
		// Parse component elements:
		const $$ = {};
		for(const element of Array.from($.querySelectorAll(`[\\@${alias}]`))) {
			const attr_ = element.removeAttributeNode(element.getAttributeNode(`@${alias}`));
			Object.setAtPath($$, attr_.value || (element.component.__alias__ ?? element.component.constructor.name), element);
		};
		// Instantiate component:
		const component = new constructors[key]($, $$);
		component.__alias__ = alias;
		components.set($, component);
	}
};

// Instantiate all (future) components:
document.addEventListener("render", event => instantiate(event.target));
instantiate();

// @debug:
// // Instantiate any new components when they are added to the document:
// new MutationObserver(mutations => mutations.some(mutation => !!mutation.addedNodes.length) && instantiate())
// .observe(document, {childList: true, subtree: true});
