// Store component instances for DOM elements:
const components = new WeakMap();

// Object deep assignment helper:
Object.setAtPath = function (obj, path, value) {
	const keys = path.replace(/\[(\d+)\]/g, ".$1").split(".");
	const key = keys.pop();
	const obj_ = keys.reduce((obj_, key_) => obj_ = obj_[key_] ?? (obj_[key_] = {}), obj);
	obj_[key] = value;
};

Object.defineProperty(HTMLElement.prototype, "component", {
	get: function () {
		return components.get(this);
	}
});

export function instantiate(root=document) {
	for(const $ of Array.from(root.querySelectorAll("[\\@]")).reverse()) {
		// Parse component key and instance alias:
		const attr = $.removeAttributeNode($.getAttributeNode("@"));
		const [key, alias=attr.value.toLowerCase()] = attr.value.split(/\sas\s/);
		if(!(key in window.components)) {
			throw `Component class ${key} does not exist.`;
		}
		// Parse component elements:
		const $$ = {};
		for(const element of Array.from($.querySelectorAll(`[\\@${alias}]`))) {
			const attr_ = element.removeAttributeNode(element.getAttributeNode(`@${alias}`));
			Object.setAtPath($$, attr_.value || (element.component.__alias__ ?? element.component.constructor.name), element);
		};
		// Instantiate component:
		const component = new window.components[key]($, $$);
		component.__alias__ = alias;
		components.set($, component);
	}
}
