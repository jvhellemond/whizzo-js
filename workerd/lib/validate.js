import {Schema} from "../../web/lib/validate.js";

const	isArray =   value => Array.isArray(value);
const	isObject =  value => value?.constructor === Object;

export default function (value, ruleset) {
	const schema = isObject(ruleset) ? Schema.isObject(ruleset) : (isArray(ruleset) ? Schema.isArray(ruleset) : ruleset);
	if(!(schema instanceof Schema)) {
		throw new TypeError("Ruleset is not an array, object or instance of Schema.");
	}
	try {
		if(value instanceof URLSearchParams) {
			return schema.validate(Object.fromEntries(value.entries()));
		}
		return schema.validate(structuredClone(value));
	}
	catch(error) {
		error.status = 400; // Trigger a specific HTTP response.
		throw error;
	}
}

export * from "../../web/lib/validate.js";
