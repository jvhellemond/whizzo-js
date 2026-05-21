import Component           from "./_component.js";
import {listen, fetchJSON} from "../lib/component.js";

const SUBMIT_MIN_DURATION = 500;

export default class Form extends Component {

	constructor($, $$) {

		super(...arguments);

		$.noValidate = true;

		listen($, "change", () => this.changed = true);

		const handler = async event => {
			const prevented = event.defaultPrevented;
			event.preventDefault();
			!prevented && !this.frozen && this.validate() && await this.submit();
		};
		listen($, "submit", handler, {passive: false});

	}

	getElementsByName(name) {
		return Array.from(document.getElementsByName(name)).filter(element => this.$.contains(element));
	}

	getElementByName(name) {
		return this.getElementsByName(name).shift();
	}

	ƒƒ = new Proxy(this, {get: (_, name) => this.getElementsByName(name)});
	ƒ =  new Proxy(this, {get: (_, name) => this.getElementByName(name)});

	// "Native" HTMLFormElement.method property value is coerced to "GET" or "POST".
	get method() { return this.$.getAttribute("method") ?? "GET"; }
	get action() { return new URL(this.$.action); }

	validate() {
		const valid = this.$.checkValidity();
		delete this.$.dataset[valid ? "invalid" : "valid"];
		this.$.dataset[valid ? "valid" : "invalid"] = "";
		!valid && this.$.querySelector(":not(fieldset):invalid")?.labels?.[0]?.scrollIntoViewIfNeeded(false);
		return valid;
	}

	presubmit()  {
		this.frozen = true;
		this.$$.submit != null && (this.$$.submit.dataset.pending = "");
	}

	postsubmit() {
		this.frozen = false;
		this.$$.submit != null && (delete this.$$.submit.dataset.pending);
	}

	async submit(minDuration=SUBMIT_MIN_DURATION) {
		const request = {method: this.method, url: this.action};
		if(this.serialize != null) {
			switch(request.method.toUpperCase()) {

				case "GET":
				case "HEAD":
				case "OPTIONS":
					Object.entries(this.serialize()).forEach(([key, value]) => request.url.searchParams.set(key, value));
					break;

				case "DELETE":
				case "PATCH":
				case "POST":
				case "PUT":
					request.body = this.serialize();
					break;

				}
		}
		try {
			this.presubmit();
			const [data] = await Promise.all([
				fetchJSON(request.method, request.url, {data: request.body}),
				sleep(minDuration)
			]);
			this.data = data;
		}
		catch(error) {
			this.dispatch("error", {error});
			throw error;
		}
		finally {
			this.postsubmit();
		}
	}

}
