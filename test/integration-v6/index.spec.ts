import { PrismaClient } from "@prisma/client";
import { stableSortExtension } from "../../src";
import { describeStableSortIntegration } from "../integration/suite";

const baseClient = new PrismaClient();
const client = baseClient.$extends(stableSortExtension(baseClient));

afterAll(async () => {
	await baseClient.$disconnect();
});

describeStableSortIntegration(client);
