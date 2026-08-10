import {
	stableSortExtension,
	stableSortMiddleware,
	type MiddlewareParamsLike,
	type PrismaClientLike,
	type QueryArgsLike,
} from "../../src";

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

const prisma7Client: PrismaClientLike = {
	_runtimeDataModel: {
		models: {
			User: {
				fields: [{ name: "id" }, { name: "createdAt" }, { name: "email" }],
			},
		},
	},
	_engineConfig: {
		inlineSchema: `
model User {
  id        Int      @id @default(autoincrement())
  createdAt DateTime @default(now())
  email     String   @unique
}
`,
	},
};

const prisma7ModelConstraintClient: PrismaClientLike = {
	_runtimeDataModel: {
		models: {
			User: {
				fields: [{ name: "id" }, { name: "createdAt" }],
			},
			Label: {
				fields: [{ name: "name" }, { name: "color" }],
			},
		},
	},
	_engineConfig: {
		inlineSchema: `
model User {
  id        Int
  createdAt DateTime

  @@id([id])
}

model Label {
  name  String
  color String

  @@unique([name])
}
`,
	},
};

describe("stableSortMiddleware", () => {
	it("throws a clear error when the runtime data model is missing", () => {
		expect(() => stableSortMiddleware({})).toThrow(
			'Could not access Prisma runtime data model on the provided client. Ensure you pass a generated Prisma client instance that exposes "_runtimeDataModel".',
		);
	});

	it("adds a unique id field to stabilize sorting when orderBy is not unique", async () => {
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

describe("stableSortExtension", () => {
	it("throws a clear error when the runtime data model is missing", () => {
		expect(() => stableSortExtension({})).toThrow(
			'Could not access Prisma runtime data model on the provided client. Ensure you pass a generated Prisma client instance that exposes "_runtimeDataModel".',
		);
	});

	it("adds a unique id field to stabilize sorting when orderBy is not unique", async () => {
		const extension = stableSortExtension(client);
		const args: QueryArgsLike = {
			orderBy: {
				createdAt: "desc",
			},
		};
		const query = jest.fn(async (nextArgs: QueryArgsLike) => nextArgs);

		await extension.query.$allModels.$allOperations({
			model: "User",
			operation: "findMany",
			args,
			query,
		});

		expect(args.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
		expect(query).toHaveBeenCalledWith(args);
	});

	it("reads unique fields from the Prisma 7 inline schema when runtime flags are absent", async () => {
		const extension = stableSortExtension(prisma7Client);
		const args: QueryArgsLike = { orderBy: { createdAt: "desc" } };
		const query = jest.fn(async (nextArgs: QueryArgsLike) => nextArgs);

		await extension.query.$allModels.$allOperations({
			model: "User",
			operation: "findMany",
			args,
			query,
		});

		expect(args.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
	});

	it("reads single-field model constraints from the Prisma 7 inline schema", async () => {
		const extension = stableSortExtension(prisma7ModelConstraintClient);
		const query = jest.fn(async (nextArgs: QueryArgsLike) => nextArgs);
		const userArgs: QueryArgsLike = { orderBy: { createdAt: "desc" } };
		const labelArgs: QueryArgsLike = { orderBy: { color: "desc" } };

		await extension.query.$allModels.$allOperations({
			model: "User",
			operation: "findMany",
			args: userArgs,
			query,
		});
		await extension.query.$allModels.$allOperations({
			model: "Label",
			operation: "findMany",
			args: labelArgs,
			query,
		});

		expect(userArgs.orderBy).toEqual([{ createdAt: "desc" }, { id: "desc" }]);
		expect(labelArgs.orderBy).toEqual([{ color: "desc" }, { name: "desc" }]);
	});

	it("uses an API-neutral error when no unique field is available", () => {
		const extension = stableSortExtension({
			_runtimeDataModel: {
				models: {
					Log: {
						fields: [{ name: "createdAt" }],
					},
				},
			},
		});

		expect(() =>
			extension.query.$allModels.$allOperations({
				model: "Log",
				operation: "findMany",
				args: { orderBy: { createdAt: "desc" } },
				query: jest.fn(),
			}),
		).toThrow("Could not find a unique field to stabilize sorting on model: 'Log'");
	});

	it("passes through models that are not in the runtime data model", async () => {
		const extension = stableSortExtension(client);
		const args: QueryArgsLike = { orderBy: { createdAt: "desc" } };
		const query = jest.fn(async (nextArgs: QueryArgsLike) => nextArgs);

		await extension.query.$allModels.$allOperations({
			model: "Unknown",
			operation: "findMany",
			args,
			query,
		});

		expect(args.orderBy).toEqual({ createdAt: "desc" });
		expect(query).toHaveBeenCalledWith(args);
	});
});
