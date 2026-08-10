import { PrismaClient } from "@prisma/client";
import { stableSortMiddleware } from "../../src";
import { describeStableSortIntegration } from "./suite";

const client = new PrismaClient();
client.$use(stableSortMiddleware(client));

afterAll(async () => {
	await client.$disconnect();
});

describeStableSortIntegration(client);
