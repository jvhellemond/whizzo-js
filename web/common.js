Object.prototype.map = function (mapper) {
	return Object.fromEntries(Object.entries(this).map(mapper));
};

String.fromInput =  (input, if_empty=null) => {
	if(input?.value == null) {
		return;
	}
	return !input.value.length ? if_empty : String(input.value);
};

Number.__LOCALE_PARTS__ = Object.fromEntries(
	new Intl.NumberFormat(window.LOCALE, {useGrouping: true})
	.formatToParts(-1234.5)
	.filter(({type}) => ["decimal", "group"].includes(type))
	.map(({type, value}) => [type, value])
);

Number.fromInput = (input, if_empty=null) => {
	if(input?.value == null) {
		return;
	}
	// Remove all grouping characters and replace any decimal delimiter with a period, then parse as a number:
	return !input.value.length
	? if_empty
	: Number(
			input.value
			.replaceAll(Number.__LOCALE_PARTS__.group, "")
			.replace(Number.__LOCALE_PARTS__.decimal, ".")
		);
};

DOMStringMap.prototype.add =    function (...keys) { keys.forEach(key => this[key] = ""); };
DOMStringMap.prototype.remove = function (...keys) { keys.forEach(key => delete this[key]); };
DOMStringMap.prototype.toggle = function (toggle, add, remove) {
	this[toggle  ? "add" : "remove"](add);
	remove != null && this[!toggle ? "add" : "remove"](remove);
};

if(HTMLElement.prototype.scrollIntoViewIfNeeded == null) {
	HTMLElement.prototype.scrollIntoViewIfNeeded = function (center=true) {
		this.scrollIntoView(!center);
	};
}

HTMLElement.prototype.show = function (toggle=true) { this.hidden = !toggle; };
HTMLElement.prototype.hide = function () { this.hidden = true; };

Object.assign(window, JSON.parse(document.documentElement.dataset.env ?? null));
delete document.documentElement.dataset.env;

window.sleep = (delay, callback, signal) => {
	return new Promise((resolve, reject) => {
		const timeout = setTimeout(
			() => {
				callback != null && callback();
				resolve();
			},
			delay
		);
		signal?.addEventListener("abort", () => {
			clearTimeout(timeout);
			reject(signal.reason);
		});
	});
};

window.debounce = (delay, callback) => {
	let timeout;
	return () => {
		clearTimeout(timeout);
		timeout = setTimeout(callback, delay);
	};
}

location.params = new URLSearchParams(location.search);
location.params.apply = (replaceState=true) => {
	const url = !!location.params.size ? `?${location.params}` : location.pathname;
	history[replaceState ? "replaceState" : "pushState"]({}, null, url);
};

history.scrollRestoration = "manual";
