export default class Component {

	constructor($, $$, this_) {

		this.$ =  $;
		this.$$ = $$;
		Object.assign(this, this_);

		this.dispatch("instance");

		// @debug:
		// console.groupCollapsed(this.constructor.name);
		// console.log($);
		// console.log($$);
		// console.groupEnd();

	}

	dispatch(types, detail, options={}) {
		[types].flat().forEach(type => this.$.dispatchEvent(new CustomEvent(type, {bubbles: true, detail, ...options})));
	}

};
