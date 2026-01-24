import {validator} from "jsr:@hono/hono@^4/validator";

/** Some common regular expressions: */
export const patterns = {
	uuid:        /^[a-f0-9]{8}-([a-f0-9]{4}-){3}[a-f0-9]{12}$/,
	slug:        /^[a-z0-9]+(?:-[a-z0-9]+)*$/i, // Contains only alphanumerics or non-consecutive hyphens, but may not start or end with a hyphen.
	email:       /^[a-z0-9_!#$%&'*+\/=?`{|}~^.-]+@[a-z0-9.-]+\.[a-z]{2,}$/i, // Inspired by https://www.abstractapi.com/guides/email-validation-regex-javascript
	countryCode: /^[a-z]{2}$/, // ISO 3166-1 alpha-2
};

/** Some utility functions: */
const	isString =  value => Object(value) instanceof String;
const	isNumber =  value => Object(value) instanceof Number;
const	isDate =    value => Object(value) instanceof Date;
const	isBoolean = value => Object(value) instanceof Boolean;
const	isRegExp =  value => Object(value) instanceof RegExp;
const	isArray =   value => Array.isArray(value);
const	isObject =  value => value?.constructor === Object;

/** A generic validation error class: */
export class ValidationError extends Error {
	constructor(path, message) {
		super(`\`${path.join(".").replace(/\.([0-9]+)/g, "[$1]")}\` ${message}`);
	}
}

/** Hono validator middleware, exported as default: */
export default function (key, ruleset) {
	const schema = isObject(ruleset) ? Schema.isObject(ruleset) : (isArray(ruleset) ? Schema.isArray(ruleset) : ruleset);
	if(!(schema instanceof Schema)) {
		throw new TypeError("Ruleset is not an array, object or instance of Schema.");
	}
	return validator(key, value => {
		try {
			return schema.validate(value, undefined, [key]);
		}
		catch(error) {
			error.status = 400; // Triggers a specific HTTP response from Hono.
			throw error;
		}
	});
}

/** A validation schema class: */
export class Schema {

	// Shorthand static getters and methods:

	static get isRequired() { return new this().isRequired; }
	static get isOptional() { return new this().isOptional; }

	static get isNotNull() { return new this().isNotNull; }
	static get mayBeNull() { return new this().mayBeNull; }

	static coerce(...args)  { return new this().coerce(...args); }

	static is(...args)      { return new this().is(...args); }
	static isAnyOf(...args) { return new this().isAnyOf(...args); }

	static isEither(...args) { return new this().isEither(...args); }

	static get isString() { return new this().isString; }
	static get isUUID()   { return new this().isUUID; }
	static get isSlug()   { return new this().isSlug; }
	static get isEmail()  { return new this().isEmail; }

	static get hasLength()          { return new this().hasLength; }
	static lengthIsAtLeast(...args) { return new this().lengthIsAtLeast(...args); }
	static lengthIsAtMost(...args)  { return new this().lengthIsAtMost(...args); }
	static lengthIsBetween(...args) { return new this().lengthIsBetween(...args); }
	static lengthIs(...args)        { return new this().lengthIs(...args); }

	static matches(...args) { return new this().matches(...args); }

	static get isNumber()  { return new this().isNumber; }
	static get isInteger() { return new this().isInteger; }
	static get isFloat()   { return new this().isFloat; }

	static get isDate() { return new this().isDate; }

	static isAtLeast(...args) { return new this().isAtLeast(...args); }
	static isAtMost(...args)  { return new this().isAtMost(...args); }
	static isBetween(...args) { return new this().isBetween(...args); }

	static isNotBefore(...args) { return new this().isNotBefore(...args); }
	static isNotAfter(...args)  { return new this().isNotAfter(...args); }

	static get isBoolean() { return new this().isBoolean; }
	static get isRegExp()  { return new this().isRegExp; }

	static isObject(...args) { return new this().isObject(...args); }
	static isArray(...args)  { return new this().isArray(...args); }

	static hasExactly(...args) { return new this().hasExactly(...args); }
	static hasAtLeast(...args) { return new this().hasAtLeast(...args); }
	static hasAtMost(...args)  { return new this().hasAtMost(...args); }
	static hasBetween(...args) { return new this().hasBetween(...args); }

	rules = {required: true, null: false, coercers: [], values: [], either: [], type: "string"};

	setRules(rules) {
		this.rules = {...this.rules, ...rules};
		return this;
	}

	// Shortcut rules:
	get isRequired() { return this.setRules({required: true}); }
	get isOptional() { return this.setRules({required: false}); }

	get isNotNull() { return this.setRules({null: false}); }
	get mayBeNull() { return this.setRules({null: true}); }

	coerce(coercers, default_) { return this.setRules({coercers: [coercers].flat(), default_}); }

	is(value)          { return this.setRules({values: [value]}); }
	isAnyOf(...values) { return this.setRules({values}); }

	// Either rule:
	isEither(...schemas) { return this.setRules({either: schemas.map(schema => schema.rules)}); }

	// String rules:

	get isString()      { return this.setRules({type: "string"}); }
	get isUUID()        { return this.setRules({type: "string", pattern: patterns.uuid}); }
	get isSlug()        { return this.setRules({type: "string", pattern: patterns.slug, length: [0, 20]}); }
	get isEmail()       { return this.setRules({type: "string", pattern: patterns.email, length: [0, 100]}); }

	get hasLength()           { return this.setRules({length: [1, Infinity]}); }
	lengthIsAtLeast(min)      { return this.setRules({length: [min, Infinity]}); }
	lengthIsAtMost(max)       { return this.setRules({length: [-Infinity, max]}); }
	lengthIsBetween(min, max) { return this.setRules({length: [min, max]}); }
	lengthIs(length)          { return this.setRules({length}); }

	matches(pattern) { return this.setRules({pattern}); }

	// Number rules:
	get isNumber()  { return this.setRules({type: "number", integer: false}); }
	get isInteger() { return this.setRules({type: "number", integer: true}); }
	get isFloat()   { return this.isNumber; }

	// Date rule:
	get isDate() { return this.setRules({type: "date"}); }

	// Range rules for numbers and dates:
	isAtLeast(min)      { return this.setRules({range: [min, Infinity]}); }
	isAtMost(max)       { return this.setRules({range: [-Infinity, max]}); }
	isBetween(min, max) { return this.setRules({range: [min, max]}); }

	// Range rule aliases for dates:
	isNotBefore(min) { return this.isAtLeast(min); }
	isNotAfter(max)  { return this.isAtMost(max); }

	// Boolean rule:
	get isBoolean() { return this.setRules({type: "boolean"}); }

	// RegExp rule:
	get isRegExp() { return this.setRules({type: "regexp"}); }

	// Object rules:

	#isObject(keys, values, entries={}, type="object") {
		const props = Object.fromEntries(Object.entries(entries).map(([key, schema]) => [key, schema.rules]));
		Object.defineProperty(props, "__keys__", {value: keys?.rules}); // This property is not enumerable and not writeable.
		Object.defineProperty(props, "__values__", {value: values?.rules}); // This property is not enumerable and not writeable.
		return this.setRules({type, props});
	}

	isObject(...args) {
		switch(args.length) {
			case 0: return this.#isObject();
			case 1:
				switch(args[0].constructor) {
					case this.constructor: return this.#isObject(undefined, args[0]);
					case Object:           return this.#isObject(undefined, undefined, args[0]);
				}
				// lint:fallthrough
			case 2:
			case 3: return this.#isObject(...args);
		}
	}

	// Array rule:
	isArray(...args) {
		switch(args.length) {
			case 0: return this.#isObject(undefined, undefined, undefined, "array");
			case 1:
				switch(args[0].constructor) {
					case this.constructor: return this.#isObject(undefined, args[0], undefined, "array");
					case Object:           return this.#isObject(undefined, undefined, args[0], "array");
				}
				// lint:fallthrough
			case 2: return this.#isObject(...args, undefined, "array");
			case 3: return this.#isObject(...args, "array");
		}
	}

	// Size rules for objects and arrays:
	hasExactly(size)     { return this.setRules({size}); }
	hasAtLeast(min)      { return this.setRules({size: [min, Infinity]}); }
	hasAtMost(max)       { return this.setRules({size: [-Infinity, max]}); }
	hasBetween(min, max) { return this.setRules({size: [min, max]}); }

	/** A validation method, applying all validation rules and returning the value's validity and, if invalid, error messages: */
	validate(value, rules=this.rules, path=[]) {

		const failure = message => {
			throw new ValidationError(path, message);
		};

		// Coerce rule:
		if(rules.coercers.length) {
			if(value != null) {
				value = rules.coercers.reduce((value_, coercer) => coercer(value_), value);
			}
			else if(rules.default_ != null) {
				value = rules.default_;
			}
		}

		// Shortcut rules:
		if(value === undefined) { return !rules.required ? value : failure("is undefined."); }
		if(value === null)      { return rules.null      ? value : failure("is null."); }

		// Values rule:
		if(rules.values.length) {
			return rules.values.includes(value) ? value : failure("does not equal any required value.");
		}

		// Either rule:
		if(rules.either.length) {
			for(const rules_ of rules.either) {
				try {
					return this.validate(value, {...rules_, either: []}, path);
				}
				catch(_error) {
					// Fail silently.
				}
			}
			return failure("is not valid for any schema.");
		}

		// Type rules:

		switch(rules.type) {

			case "string":

				// String type:
				if(!isString(value)) { return failure("is not a string."); }

				// String length:
				if(isNumber(rules.length) && value.length != rules.length) {
					return failure(`length is not ${rules.length}.`);
				}
				if(isArray(rules.length)) {
					const [min, max] = rules.length;
					if(value.length < min) { return failure(`is shorter than ${min} characters.`); }
					if(value.length > max) { return failure(`is longer than ${max} characters.`); }
				}

				// String pattern:
				if(isRegExp(rules.pattern) && !rules.pattern.test(value)) {
					const [key] = Object.entries(patterns).find(([_, pattern]) => pattern == rules.pattern);
					return failure(`does not match the pattern \`${key || rules.pattern}\`.`);
				}

				break;

			case "number":

				// Number type:
				if(!isNumber(value))               { return failure("is not a number"); }
				if(rules.integer && !!(value % 1)) { return failure("is not an integer"); }

				// Number range:
				if(isArray(rules.range)) {
					const [min, max] = rules.range;
					if(isNumber(min) && value < min) { return failure(`is less than ${min}.`); }
					if(isNumber(max) && value > max) { return failure(`is greater than ${max}.`); }
				}

				break;

			case "date":

				// Date type:
				if(!isDate(value)) { return failure("is not a date."); }

				// Date range:
				if(isArray(rules.range)) {
					const [min, max] = rules.range;
					if(isDate(min) && value < min) { return failure(`is before ${min}.`); }
					if(isDate(max) && value > max) { return failure(`is after ${max}.`); }
				}

				break;

			case "boolean":

				// Boolean type:
				if(!isBoolean(value)) { return failure("is not a boolean."); }
				break;

			case "regexp":

				// RegExp type:
				if(!isRegExp(value)) { return failure("is not a regular expression."); }
				break;

			case "object": {

				// Object type:
				if(!isObject(value)) { return failure("is not an object."); }

				// Object size:
				const size = Object.keys(value).length;
				if(isNumber(rules.size) && size != rules.size) {
					return failure(`does not have exactly ${rules.size} ${rules.size == 1 ? "property" : "properties"}.`);
				}
				if(isArray(rules.size)) {
					const [min, max] = rules.size;
					if(size < min) { return failure(`has fewer than ${min} properties.`); }
					if(size > max) { return failure(`has more than ${max} properties.`); }
				}

				// Object properties:
				if(isObject(rules.props)) {

					// Disallow unnamed properties, unless rules.props has either __keys__ or __values__:
					if(
						(rules.props.__keys__ == null && rules.props.__values__ == null)
						&& !(new Set(Object.keys(rules.props))).isSupersetOf(new Set(Object.keys(value)))
					) {
						return failure("contains unspecified properties.");
					}

					// Validate all named property values:
					for(const [key, rules_] of Object.entries(rules.props)) {
						const value_ = this.validate(value[key], rules_, [...path, key]);
						key in value && (value[key] = value_);
					};

					// Validate any unnamed property keys:
					if(isObject(rules.props.__keys__)) {
						for(const [key] of Object.entries(value).filter(([key]) => !(key in rules.props))) {
							const key_ = this.validate(key, rules.props.__keys__, [...path, `${key}*`]);
							if(key != key_) {
								value[key_] = value[key];
								delete value[key];
							}
						}
					}

					// Validate any unnamed property values:
					if(isObject(rules.props.__values__)) {
						for(const [key, value_] of Object.entries(value).filter(([key]) => !(key in rules.props))) {
							const value__ = this.validate(value_, rules.props.__values__, [...path, key]);
							value[key] = value__;
						}
					}

				}

				break;

			}

			case "array":

				// Array type:
				if(!isArray(value)) { return failure("is not an array."); }

				// Array size (length):
				if(isNumber(rules.size) && value.length != rules.size) {
					return failure(`does not have exactly ${rules.size} ${rules.size == 1 ? "item" : "items"}.`);
				}
				if(isArray(rules.size)) {
					const [min, max] = rules.size;
					if(value.length < min) { return failure(`has fewer than ${min} items.`); }
					if(value.length > max) { return failure(`has more than ${max} items.`); }
				}

				// Array items:
				if(isObject(rules.props)) {

					// Disallow additional items, unless rules.props has __values__:
					if(rules.props.__values__ == null && value.length > Object.keys(rules.props).length) {
						return failure("contains unspecified items.");
					}

					// Validate all named item values:
					for(const [key, rules_] of Object.entries(rules.props)) {
						const value_ = this.validate(value[key], rules_, [...path, key]);
						key in value && (value[key] = value_);
					};

					// Validate any unnamed item values:
					if(isObject(rules.props.__values__)) {
						for(const [key, value_] of Object.entries(value).filter(([key]) => !(key in rules.props))) {
							const value__ = this.validate(value_, rules.props.__values__, [...path, key]);
							value[key] = value__;
						}
					}

				}

				break;

		}

		return value;

	}

	/** A method to check the integrity of a validation schema: */
	check() {
		const µ = this.constructor;
		return µ.isObject({
			required: µ.isBoolean,
			null:     µ.isBoolean,
			coercers: µ.isArray,
			values:   µ.isArray().hasAtLeast(1),
			either:   µ.isArray().hasAtLeast(2),
			type:     µ.isAnyOf("string", "number", "date", "boolean", "regexp", "object", "array"),
			length:   µ.isOptional.isEither(µ.isInteger, µ.isArray({0: µ.isInteger, 1: µ.isInteger}).hasExactly(2)),
			pattern:  µ.isOptional.isRegExp,
			integer:  µ.isOptional.isBoolean,
			range:    µ.isOptional.isArray({0: µ.isEither(µ.isNumber, µ.isDate), 1: µ.isEither(µ.isNumber, µ.isDate)}).hasExactly(2),
			size:     µ.isOptional.isEither(µ.isInteger, µ.isArray({0: µ.isInteger, 1: µ.isInteger}).hasExactly(2)),
			props:    µ.isOptional.isObject(µ.isObject())
		})
		.validate(this.rules);
		// @todo: Warn about useless (redundant) combinations of rules, like `{type: "string", size: 5}` or `{type: "array", pattern: RegExp}`.
	}

}
