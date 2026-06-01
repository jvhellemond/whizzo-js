Object.defineProperty(HTMLElement.prototype, "component", {
	get: function () {
		return components.get(this);
	}
});

// Store component instances for DOM elements:
const components = new WeakMap();

const getElements = ($, alias) => {
	const $$ = {};
	for(const element of Array.from($.querySelectorAll(`[\\@${alias}]`))) {
		const attr = element.removeAttributeNode(element.getAttributeNode(`@${alias}`));
		Object.set($$, attr.value || (element.component.__alias__ ?? element.component.constructor.name), element);
	};
	return $$;
};

export function instantiate(root=document) {
	for(const $ of Array.from(root.querySelectorAll("[\\@]")).reverse()) {

		// Parse component key and instance alias:
		const attr = $.removeAttributeNode($.getAttributeNode("@"));
		const [key, alias=attr.value.toLowerCase()] = attr.value.split(/\sas\s/);
		if(!(key in window.components)) {
			throw new Error(`Component class ${key} does not exist.`);
		}

		// Instantiate the component:
		const component = new window.components[key]($, getElements($, alias));
		components.set($, component);
		component.__alias__ = alias;

		// Render the component:
		if(component.render != null) {
			const callback =  () => {
				Object.assign(component.$$, getElements($, alias));
				component.initialize != null && component.initialize($, component.$$);
			};
			$.addEventListener("render", callback, {capture: true, passive: true});
			component.render(); // Intentionally not awaiting here.
		}

	}
}
