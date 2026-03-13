declare module 'react-date-range' {
	import * as React from 'react';

	export type Range = {
		startDate?: Date;
		endDate?: Date;
		key?: string;
	};

	export const DateRange: React.ComponentType<any>;
}
