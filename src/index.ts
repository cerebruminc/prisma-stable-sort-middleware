export interface RuntimeFieldLike {
	name: string;
	isId: boolean;
	isUnique: boolean;
}

export interface RuntimeModelLike {
	fields: RuntimeFieldLike[];
}

export interface RuntimeDataModelLike {
	models: { [model: string]: RuntimeModelLike };
}

export type RuntimeDataModel = RuntimeDataModelLike;

export type PrismaClientLike = object & { _runtimeDataModel?: RuntimeDataModelLike };

export interface MiddlewareParamsLike {
	model?: string;
	action?: string;
	args?: {
		orderBy?: Record<string, unknown> | Array<Record<string, unknown>>;
		[key: string]: unknown;
	};
	dataPath?: string[];
	runInTransaction?: boolean;
	[key: string]: unknown;
}

type MiddlewareNextLike = (params: any) => Promise<any> | any;

export type MiddlewareLike = (params: any, next: MiddlewareNextLike) => Promise<any> | any;

const getRuntimeDataModel = (client: PrismaClientLike): RuntimeDataModelLike => {
	const runtimeDataModel = client._runtimeDataModel;

	if (!(runtimeDataModel?.models && typeof runtimeDataModel.models === "object")) {
		throw new Error(
			`Could not access Prisma runtime data model on the provided client. Ensure you pass a generated Prisma client instance that exposes "_runtimeDataModel".`,
		);
	}

	return runtimeDataModel;
};

const castArray = <T>(value: T | T[]): T[] => {
	if (Array.isArray(value)) {
		return value;
	}
	return [value];
};

// Creates an object indicating the unique fields for each model
const getUniqueFieldData = (client: PrismaClientLike) => {
	const uniqueFields: { [model: string]: { [field: string]: boolean } } = {};
	const runtimeDataModel = getRuntimeDataModel(client);
	for (const key in runtimeDataModel.models) {
		if (!uniqueFields[key]) {
			uniqueFields[key] = {};
		}
		for (const field of runtimeDataModel.models[key].fields) {
			uniqueFields[key][field.name] = field.isId || field.isUnique;
		}
	}

	return uniqueFields;
};

// If the orderBy is just createdAt, add an id desc to the end of the orderBy
// The unique ID stabilizes the sort, providing consistent ordering when the createdAt is the same
// This is needed because the createdAt is not unique, and batch uploads will have the same createdAt
export const stableSortMiddleware = (client: PrismaClientLike): MiddlewareLike => {
	const uniqueFields = getUniqueFieldData(client);

	return (params: MiddlewareParamsLike, next: MiddlewareNextLike) => {
		const { model, action } = params;

		if (!(model && action)) {
			return next(params);
		}
		if (!uniqueFields[model]) {
			return next(params);
		}

		const args = params.args;
		// In Prisma, sorting by a single field can be done by passing a plain object, so for convenience we cast it to an array
		const orderBy = args?.orderBy ? castArray(args.orderBy) : null;

		if (orderBy && args) {
			const hasUniqueField = orderBy.some((o) => {
				const [field] = Object.keys(o);
				return uniqueFields[model][field];
			});
			// If the orderBy does not contain a unique field, add one to stabilize the sort
			if (!hasUniqueField) {
				// Prefer to stabilise by a unique ID if there is one available
				if (uniqueFields[model].id && uniqueFields[model].id === true) {
					orderBy.push({ id: "desc" });
				} else {
					// Otherwise, use the first unique field to stabilise the sort
					const uniqueField = Object.entries(uniqueFields[model]).find(([, isUnique]) => isUnique);

					if (!uniqueField) {
						throw new Error(`Could not find a unique field to use for "stableSortMiddleware" on model: '${model}'`);
					}
					if (uniqueField) {
						const [fieldName] = uniqueField;
						orderBy.push({ [fieldName]: "desc" });
					}
				}
				args.orderBy = orderBy;
			}
		}
		return next(params);
	};
};
