import type { Prisma, PrismaClient } from "@prisma/client";
import { RuntimeDataModel } from "@prisma/client/runtime/library";

const castArray = <T>(value: T | T[]): T[] => {
	if (Array.isArray(value)) {
		return value;
	}
	return [value];
};

// Creates an object indicating the unique fields for each model
const getUniqueFieldData = (client: PrismaClient) => {
	const uniqueFields: { [model: string]: { [field: string]: boolean } } = {};
	const runtimeDataModel = (client as any)._runtimeDataModel as RuntimeDataModel;
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
export const stableSortMiddleware = (client: PrismaClient): Prisma.Middleware => {
	const uniqueFields = getUniqueFieldData(client);

	return (params, next) => {
		const { model, action } = params;

		if (!(model && action)) {
			return next(params);
		}

		// In Prisma, sorting by a single field can be done by passing a plain object, so for convenience we cast it to an array
		const orderBy = params?.args?.orderBy ? castArray(params.args.orderBy) : null;

		if (orderBy) {
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
				params.args.orderBy = orderBy;
			}
		}
		return next(params);
	};
};
