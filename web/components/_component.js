export default class Component {

	constructor($, $$, this_) {
		this.$ =  $;
		this.$$ = $$;
		Object.assign(this, this_);
		this.dispatch("instance", {name: this.constructor.name});
	}

	dispatch(types, detail, options={}) {
		[types].flat().forEach(type => this.$.dispatchEvent(new CustomEvent(type, {bubbles: true, detail, ...options})));
	}

};
