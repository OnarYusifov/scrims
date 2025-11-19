import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@trayb/db";
import { z } from "zod";

const unlinkSchema = z.object({
	provider: z.enum(["google", "discord", "steam"]),
});

export async function POST(request: NextRequest) {
	try {
		const session = await auth();
		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}
		const body = await request.json();
		const { provider } = unlinkSchema.parse(body);

		// Ensure account exists
		const account = await prisma.account.findFirst({
			where: {
				userId: session.user.id,
				provider,
			},
		});
		if (!account) {
			return NextResponse.json({ error: "Account not linked" }, { status: 400 });
		}

		// Ensure user is not left without any auth method
		const [otherAccounts, user] = await Promise.all([
			prisma.account.count({
				where: {
					userId: session.user.id,
					NOT: { provider },
				},
			}),
			prisma.user.findUnique({
				where: { id: session.user.id },
				select: { password: true, discord: true },
			}),
		]);

		const hasPassword = Boolean(user?.password);
		const hasAnotherProvider = otherAccounts > 0;
		if (!hasPassword && !hasAnotherProvider) {
			return NextResponse.json(
				{ error: "Cannot unlink the only sign-in method. Add a password or link another provider first." },
				{ status: 400 },
			);
		}

		// Delete the provider account (and clear provider-specific profile fields if any)
		await prisma.$transaction(async (tx) => {
			await tx.account.delete({ where: { id: account.id } });
			if (provider === "discord" && user?.discord) {
				await tx.user.update({
					where: { id: session.user.id },
					data: { discord: null },
				});
			}
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("unlink POST error:", error);
		if (error instanceof Error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}
		return NextResponse.json({ error: "Failed to unlink account" }, { status: 500 });
	}
}



