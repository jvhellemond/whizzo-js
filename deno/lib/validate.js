import {validator} from "jsr:@hono/hono@^4/validator";

import {Schema} from "../../web/lib/validate.js";

const	isArray =  value => Array.isArray(value);
const	isObject = value => value?.constructor === Object;

// Hono validator middleware:
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

export * from "../../web/lib/validate.js";
