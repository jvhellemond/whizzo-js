export default {
	number: {
		integer: {useGrouping: true, maximumFractionDigits: 0},
		float:   {useGrouping: true, maximumFractionDigits: 2},
		amount:  {useGrouping: true, minimumFractionDigits: 2, maximumFractionDigits: 2}
	},
	date: {
		short:   {day: "2-digit", month: "2-digit", year: "numeric"},
		medium:  {day: "numeric", month: "long",    year: "numeric"},
		long:    {day: "numeric", month: "long",    year: "numeric"},
		tabular: {day: "2-digit", month: "short",   year: "numeric"}
	},
	time: {
		short:   {hour: "numeric", minute: "2-digit", hour12: false},
		tabular: {hour: "2-digit", minute: "2-digit", hour12: false}
	}
}
