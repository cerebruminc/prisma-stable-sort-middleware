import { PrismaClient } from "@prisma/client";
import { v4 as uuid } from "uuid";
import { stableSortMiddleware } from "../../src";

let client: PrismaClient;

beforeAll(async () => {
	client = new PrismaClient();
	client.$use(stableSortMiddleware(client));
});

describe("setup", () => {
	it("should return results in stable order when the createdAt timestamp is the same", async () => {
		const time1 = "2022-02-23T16:57:15.462Z";
		const time2 = "2021-01-23T16:57:15.462Z";
		const name = `test-name-${uuid()}`;
		const users = await Promise.all([
			client.user.create({
				data: {
					name,
					email: `${uuid()}@example.com`,
					createdAt: time1,
				},
			}),
			client.user.create({
				data: {
					name,
					email: `${uuid()}@example.com`,
					createdAt: time1,
				},
			}),
			client.user.create({
				data: {
					name,
					email: `${uuid()}@example.com`,
					createdAt: time1,
				},
			}),
			client.user.create({
				data: {
					name,
					email: `${uuid()}@example.com`,
					createdAt: time2,
				},
			}),
			client.user.create({
				data: {
					name,
					email: `${uuid()}@example.com`,
					createdAt: time2,
				},
			}),
			client.user.create({
				data: {
					name,
					email: `${uuid()}@example.com`,
					createdAt: time2,
				},
			}),
			client.user.create({
				data: {
					name,
					email: `${uuid()}@example.com`,
					createdAt: time2,
				},
			}),
			client.user.create({
				data: {
					name,
					email: `${uuid()}@example.com`,
					createdAt: time2,
				},
			}),
		]);

		// Sort users by createdAt and then id (desc)
		const sortedUsers = users.sort((a, b) => {
			if (a.createdAt > b.createdAt) {
				return -1;
			}
			if (a.createdAt < b.createdAt) {
				return 1;
			}
			if (a.id > b.id) {
				return -1;
			}
			if (a.id < b.id) {
				return 1;
			}
			return 0;
		});

		// Test with orderBy as an array
		const results1 = await client.user.findMany({
			where: {
				name,
			},
			orderBy: [
				{
					createdAt: "desc",
				},
			],
		});

		expect(results1.map((o: any) => o.id)).toEqual(sortedUsers.map((o) => o.id));

		// Test with orderBy as an object
		const results2 = await client.user.findMany({
			where: {
				name,
			},
			orderBy: {
				createdAt: "desc",
			},
		});

		expect(results2.map((o: any) => o.id)).toEqual(sortedUsers.map((o) => o.id));
	});

	it("should return results in stable order when a non-unique column is the same", async () => {
		const title1 = `test-title-${uuid()}`;
		const title2 = `test-title-${uuid()}`;
		const posts = await Promise.all([
			client.post.create({
				data: {
					title: title1,
				},
			}),
			client.post.create({
				data: {
					title: title1,
				},
			}),
			client.post.create({
				data: {
					title: title1,
				},
			}),
			client.post.create({
				data: {
					title: title1,
				},
			}),
			client.post.create({
				data: {
					title: title2,
				},
			}),
			client.post.create({
				data: {
					title: title2,
				},
			}),
			client.post.create({
				data: {
					title: title2,
				},
			}),
		]);

		// Sort posts by title and then id (desc)
		const sortedPosts = posts.sort((a, b) => {
			if (a.title > b.title) {
				return -1;
			}
			if (a.title < b.title) {
				return 1;
			}
			if (a.id > b.id) {
				return -1;
			}
			if (a.id < b.id) {
				return 1;
			}
			return 0;
		});

		const results = await client.post.findMany({
			where: {
				OR: [
					{
						title: title1,
					},
					{
						title: title2,
					},
				],
			},
			orderBy: [
				{
					title: "desc",
				},
			],
		});

		expect(results.map((o: any) => o.id)).toEqual(sortedPosts.map((o) => o.id));
	});

	it("should return results in stable order when a non-unique column is the same on a model with no id field", async () => {
		const color1 = `test-color-${uuid()}`;
		const color2 = `test-color-${uuid()}`;
		const labels = await Promise.all([
			client.label.create({
				data: {
					color: color1,
					name: `test-name-${uuid()}`,
				},
			}),
			client.label.create({
				data: {
					color: color1,
					name: `test-name-${uuid()}`,
				},
			}),
			client.label.create({
				data: {
					color: color1,
					name: `test-name-${uuid()}`,
				},
			}),
			client.label.create({
				data: {
					color: color2,
					name: `test-name-${uuid()}`,
				},
			}),
			client.label.create({
				data: {
					color: color2,
					name: `test-name-${uuid()}`,
				},
			}),
			client.label.create({
				data: {
					color: color2,
					name: `test-name-${uuid()}`,
				},
			}),
		]);

		// Sort posts by color and then name (desc)
		// In this case, "name" is the only unique field on the Label model, so that will be used to stabilise sort
		const sorted = labels.sort((a, b) => {
			if (a.color > b.color) {
				return -1;
			}
			if (a.color < b.color) {
				return 1;
			}
			if (a.name > b.name) {
				return -1;
			}
			if (a.name < b.name) {
				return 1;
			}
			return 0;
		});

		const results = await client.label.findMany({
			where: {
				OR: [
					{
						color: color1,
					},
					{
						color: color2,
					},
				],
			},
			orderBy: [
				{
					color: "desc",
				},
			],
		});

		expect(results.map((o) => o.name)).toEqual(sorted.map((o) => o.name));
	});
});
