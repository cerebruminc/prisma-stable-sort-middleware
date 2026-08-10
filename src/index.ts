export interface RuntimeFieldLike {
	name: string;
	isId?: boolean;
	isUnique?: boolean;
}

export interface RuntimeModelLike {
	fields: RuntimeFieldLike[];
}

export interface RuntimeDataModelLike {
	models: { [model: string]: RuntimeModelLike };
}

export type RuntimeDataModel = RuntimeDataModelLike;

export type PrismaClientLike = object & {
	_runtimeDataModel?: RuntimeDataModelLike;
	_engineConfig?: { inlineSchema?: unknown };
};

export interface QueryArgsLike {
	orderBy?: Record<string, unknown> | Array<Record<string, unknown>>;
	[key: string]: unknown;
}

export interface MiddlewareParamsLike {
	model?: string;
	action?: string;
	args?: QueryArgsLike;
	dataPath?: string[];
	runInTransaction?: boolean;
	[key: string]: unknown;
}

type MiddlewareNextLike = (params: any) => Promise<any> | any;

export type MiddlewareLike = (params: any, next: MiddlewareNextLike) => Promise<any> | any;

export interface QueryExtensionParamsLike {
	model: string;
	operation: string;
	args: QueryArgsLike;
	query: (args: QueryArgsLike) => Promise<any> | any;
	[key: string]: unknown;
}

export interface StableSortExtensionLike {
	name: string;
	query: {
		$allModels: {
			$allOperations: (params: QueryExtensionParamsLike) => Promise<any> | any;
		};
	};
}

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

// The Prisma 7 `prisma-client` generator omits uniqueness flags from `_runtimeDataModel`,
// but retains the schema used to generate the client in `_engineConfig.inlineSchema`.
const getInlineSchemaUniqueFields = (client: PrismaClientLike) => {
	const uniqueFields: { [model: string]: Set<string> } = {};
	const inlineSchema = client._engineConfig?.inlineSchema;

	if (typeof inlineSchema !== "string") {
		return uniqueFields;
	}

	let currentModel: string | null = null;
	for (const line of inlineSchema.split(/\r?\n/)) {
		const normalizedLine = line.replace(/"(?:\\.|[^"\\])*"/g, '""').trim();

		if (!currentModel) {
			const model = /^model\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/.exec(normalizedLine);
			if (model) {
				currentModel = model[1];
				uniqueFields[currentModel] = new Set();
			}
			continue;
		}

		if (normalizedLine === "}") {
			currentModel = null;
			continue;
		}
		if (normalizedLine.startsWith("//")) {
			continue;
		}
		if (normalizedLine.startsWith("@@")) {
			const singleFieldConstraint =
				/^@@(?:id|unique)\s*\(\s*(?:fields\s*:\s*)?\[\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:\([^)]*\))?\s*\]\s*(?:,|\))/.exec(
					normalizedLine,
				);
			if (singleFieldConstraint) {
				uniqueFields[currentModel].add(singleFieldConstraint[1]);
			}
			continue;
		}
		if (!/(?:^|\s)@(?:id|unique)\b/.test(normalizedLine)) {
			continue;
		}

		const field = /^([A-Za-z_][A-Za-z0-9_]*)\s+/.exec(normalizedLine);
		if (field) {
			uniqueFields[currentModel].add(field[1]);
		}
	}

	return uniqueFields;
};

// Creates an object indicating the unique fields for each model
const getUniqueFieldData = (client: PrismaClientLike) => {
	const uniqueFields: { [model: string]: { [field: string]: boolean } } = {};
	const runtimeDataModel = getRuntimeDataModel(client);
	const inlineSchemaUniqueFields = getInlineSchemaUniqueFields(client);
	for (const key in runtimeDataModel.models) {
		if (!uniqueFields[key]) {
			uniqueFields[key] = {};
		}
		for (const field of runtimeDataModel.models[key].fields) {
			uniqueFields[key][field.name] =
				field.isId === true || field.isUnique === true || inlineSchemaUniqueFields[key]?.has(field.name) === true;
		}
	}

	return uniqueFields;
};

const stabilizeOrderBy = (
	uniqueFields: { [model: string]: { [field: string]: boolean } },
	model: string,
	args?: QueryArgsLike,
) => {
	// In Prisma, sorting by a single field can be done by passing a plain object, so for convenience we cast it to an array
	const orderBy = args?.orderBy ? castArray(args.orderBy) : null;

	if (!(orderBy && args)) {
		return;
	}

	const hasUniqueField = orderBy.some((o) => {
		const [field] = Object.keys(o);
		return uniqueFields[model][field];
	});
	// If the orderBy does not contain a unique field, add one to stabilize the sort
	if (hasUniqueField) {
		return;
	}

	// Prefer to stabilise by a unique ID if there is one available
	if (uniqueFields[model].id && uniqueFields[model].id === true) {
		orderBy.push({ id: "desc" });
	} else {
		// Otherwise, use the first unique field to stabilise the sort
		const uniqueField = Object.entries(uniqueFields[model]).find(([, isUnique]) => isUnique);

		if (!uniqueField) {
			throw new Error(`Could not find a unique field to stabilize sorting on model: '${model}'`);
		}
		const [fieldName] = uniqueField;
		orderBy.push({ [fieldName]: "desc" });
	}
	args.orderBy = orderBy;
};

/**
 * Legacy middleware API for Prisma 5 and Prisma 6.0–6.13 applications.
 * New integrations should use `stableSortExtension`; Prisma 6.14 removed the `$use` middleware API.
 */
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

		stabilizeOrderBy(uniqueFields, model, params.args);
		return next(params);
	};
};

// Prisma 7 removes the client middleware API. Query extensions are supported by Prisma 5, 6, and 7.
export const stableSortExtension = (client: PrismaClientLike): StableSortExtensionLike => {
	const uniqueFields = getUniqueFieldData(client);

	return {
		name: "stable-sort",
		query: {
			$allModels: {
				$allOperations({ model, args, query }) {
					if (uniqueFields[model]) {
						stabilizeOrderBy(uniqueFields, model, args);
					}
					return query(args);
				},
			},
		},
	};
};
