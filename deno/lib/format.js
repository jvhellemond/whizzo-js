const LOCALE = Deno.env.get("LOCALE");

const formats = {
	number: {
		integer: {useGrouping: true, maximumFractionDigits: 0},
		float:   {useGrouping: true, maximumFractionDigits: 2},
		amount:  {useGrouping: true, minimumFractionDigits: 2, maximumFractionDigits: 2}
	},
	date: {
		short:   {day: "2-digit", month: "2-digit", year: "numeric"},
		medium:  {day: "numeric", month: "long"},
		long:    {day: "numeric", month: "long", year: "numeric"},
		tabular: {day: "2-digit", month: "short", year: "numeric"}
	},
	time: {
		short: {
			hour:    "numeric",
			minute:   "2-digit",
			pedantry: {"nl-NL": value => value.replace(":", ".")} // See https://onzetaal.nl/taalloket/tijden-noteren 🤓
		},
		tabular: {
			hour:   "2-digit",
			minute: "2-digit"
		}
	}
};

const toLocaleString = (value, format, locale=LOCALE) => {
	const output = value.toLocaleString(locale, format);
	const pedantry = format.pedantry?.[locale];
	return pedantry != null ? pedantry(output) : output;
}

export function toLocaleNumberString(value, optionsOrKey, locale) {
	return toLocaleString(value, formats.number[optionsOrKey] ?? optionsOrKey, locale);
}

export function toLocaleDateString(value, optionsOrKey, locale) {
	return toLocaleString(value, formats.date[optionsOrKey] ?? optionsOrKey, locale);
}

export function toLocaleTimeString(value, optionsOrKey, locale) {
	return toLocaleString(value, formats.time[optionsOrKey] ?? optionsOrKey, locale);
}

export default formats;
