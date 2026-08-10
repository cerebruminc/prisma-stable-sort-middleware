import { PrismaPg } from "@prisma/adapter-pg";
import { stableSortExtension } from "../../src";
import { describeStableSortIntegration } from "../integration/suite";
import { PrismaClient } from "../fixtures/prisma7/generated/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
	throw new Error("DATABASE_URL is required");
}

const baseClient = new PrismaClient({
	adapter: new PrismaPg({ connectionString }),
});
const client = baseClient.$extends(stableSortExtension(baseClient));

afterAll(async () => {
	await baseClient.$disconnect();
});

describeStableSortIntegration(client);
