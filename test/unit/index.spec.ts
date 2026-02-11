import { stableSortMiddleware, type MiddlewareParamsLike, type PrismaClientLike } from "../../src";

describe("stableSortMiddleware", () => {
	it("throws a clear error when the runtime data model is missing", () => {
		expect(() => stableSortMiddleware({})).toThrow(
			'Could not access Prisma runtime data model on the provided client. Ensure you pass a generated Prisma client instance that exposes "_runtimeDataModel".',
		);
	});

	it("adds a unique id field to stabilize sorting when orderBy is not unique", async () => {
		const client: PrismaClientLike = {
			_runtimeDataModel: {
				models: {
					User: {
						fields: [
							{ name: "id", isId: true, isUnique: false },
							{ name: "createdAt", isId: false, isUnique: false },
							{ name: "email", isId: false, isUnique: true },
						],
					},
				},
			},
		};

		const middleware = stableSortMiddleware(client);
		const params: MiddlewareParamsLike = {
			model: "User",
			action: "findMany",
			args: {
				orderBy: {
					createdAt: "desc",
				},
			},
			dataPath: [],
			runInTransaction: false,
		};

		const next = jest.fn(async (nextParams: MiddlewareParamsLike) => nextParams);

		await middleware(params, next);

		expect(params.args?.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
		expect(next).toHaveBeenCalledWith(params);
	});
});
