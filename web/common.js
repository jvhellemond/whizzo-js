Object.map = function (obj, mapper) {
	return Object.fromEntries(Object.entries(obj).map(mapper));
};

Object.set = function (obj, path, value) {
	const keys = path.replace(/\[(\d+)\]/g, ".$1").split(".");
	const key = keys.pop();
	const obj_ = keys.reduce((obj_, key_) => obj_ = obj_[key_] ?? (obj_[key_] = {}), obj);
	obj_[key] = value;
};

String.fromInput =  (input, if_empty=null) => {
	if(input?.value == null) {
		return;
	}
	return !input.value.length ? if_empty : String(input.value);
};

Number.fromInput = (input, if_empty=null) => {
	Number.__LOCALE_PARTS__ ??= Object.fromEntries(
		new Intl.NumberFormat(window.locale, {useGrouping: true})
		.formatToParts(-1234.5)
		.filter(({type}) => ["decimal", "group"].includes(type))
		.map(({type, value}) => [type, value])
	);
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

if(HTMLElement.prototype.scrollIntoViewIfNeeded == null) {
	HTMLElement.prototype.scrollIntoViewIfNeeded = function (center=true) {
		this.scrollIntoView(!center);
	};
}

HTMLElement.prototype.show = function (toggle=true) { this.hidden = !toggle; };
HTMLElement.prototype.hide = function () { this.hidden = true; };

URLSearchParams.prototype.setOrDelete = function (key, value) {
	value != null ? this.set(key, value) : this.delete(key);
};
URLSearchParams.prototype.setFrom = function (params) {
	params.entries().forEach(([key, value]) => this.set(key, value));
};

window.locale = document.documentElement.lang;

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

location.searchParams = new URLSearchParams(location.search);
location.searchParams.apply = (replaceState=true) => {
	const url = !!location.searchParams.size ? `?${location.searchParams}` : location.pathname;
	history[replaceState ? "replaceState" : "pushState"]({}, null, url);
};

history.scrollRestoration = "manual";
