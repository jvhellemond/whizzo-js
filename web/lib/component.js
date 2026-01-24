const FETCH_REQUEST_HEADERS = {
	"Accept":            "application/json",
	"Content-Type":      "application/json",
	"X-Client-Hostname": location.hostname
};

export class FetchJSONError extends Error {}

export async function fetchJSON(method, url, {data, throwOn401=false, throwOn404=false} = {}) {
	const url_ = new URL(url, location.origin);
	const response = await fetch(url_, {method, headers: FETCH_REQUEST_HEADERS, body: JSON.stringify(data)});
	if(response.status == 401 && !throwOn401) {
		location.assign("/auth/session");
		return;
	}
	if(response.status == 404 && !throwOn404) {
		return null;
	}
	if(!response.ok) {
		throw new FetchJSONError(`${method.toUpperCase()} ${url_}\n${response.status} ${response.statusText}`.trim());
	}
	if(/^application\/json(;|$)/.test(response.headers.get("Content-Type"))) {
		return await response.json();
	}
};

// @todo: Return a single(ton) handler or register handlers somwhere (a WeakMap?) to (be able to) unlisten?
export function listen(targets, types, handler, options={}) {
	const options_ = Object.assign({passive: true}, options);
	for(const target of [targets].flat()) {
		for(const type of [types].flat()) {
			if(/^(keydown|keyup|keypress)\:.+$/.test(type)) {
				const [type_, key] = type.split(":");
				const handler_ = (event, ...args) => event.key == key && handler(event, ...args);
				target.addEventListener(type_, handler_, options_);
				continue;
			}
			target.addEventListener(type, handler, options_);
		}
	}
};
