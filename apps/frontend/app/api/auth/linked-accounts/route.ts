import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@trayb/db";

export async function GET() {
	try {
		const session = await auth();
		if (!session?.user?.email || !session.user.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		const [accounts, user] = await Promise.all([
			prisma.account.findMany({
				where: { userId: session.user.id },
				select: { id: true, provider: true, providerAccountId: true },
			}),
			prisma.user.findUnique({
				where: { id: session.user.id },
				select: { password: true },
			}),
		]);

		const hasPassword = Boolean(user?.password);

		return NextResponse.json({
			accounts: accounts.map((a) => ({ provider: a.provider, providerAccountId: a.providerAccountId })),
			hasPassword,
		});
	} catch (error) {
		console.error("linked-accounts GET error:", error);
		return NextResponse.json({ error: "Failed to load linked accounts" }, { status: 500 });
	}
}



