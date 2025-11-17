"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthPage } from "@/components/auth-page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function DeviceVerifyPage() {
	const router = useRouter();
	const params = useSearchParams();
	const email = useMemo(() => params?.get("email") || "", [params]);
	const deviceId = useMemo(() => params?.get("deviceId") || "", [params]);
	const [code, setCode] = useState("");
	const [sending, setSending] = useState(false);
	const [verifying, setVerifying] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	useEffect(() => {
		// send code on mount
		const start = async () => {
			if (!email || !deviceId) return;
			setSending(true);
			setError(null);
			setSuccess(null);
			try {
				const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/device/start`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ email, deviceId }),
				});
				if (!res.ok) {
					setError("Failed to send code. Please try again.");
				} else {
					setSuccess("Verification code sent to your email.");
				}
			} catch {
				setError("Failed to send code. Please try again.");
			} finally {
				setSending(false);
			}
		};
		start();
	}, [email, deviceId]);

	const onVerify = async () => {
		if (!email || !deviceId || !code) return;
		setVerifying(true);
		setError(null);
		setSuccess(null);
		try {
			const res = await fetch("/api/auth/verify-device", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ email, deviceId, code }),
			});
			const data = await res.json();
			if (!res.ok) {
				setError(data.error || "Verification failed. Please check your code and try again.");
				return;
			}
			setSuccess("Device trusted for 14 days. Redirecting...");
			setTimeout(() => {
				router.push("/");
			}, 1000);
		} catch {
			setError("Verification failed. Please try again.");
		} finally {
			setVerifying(false);
		}
	};

	return (
		<AuthPage hideTitle showSocialButtons={false} mode="login">
			<div className="space-y-4">
				<h2 className="font-semibold text-lg">Verify this device</h2>
				<p className="text-sm text-muted-foreground">We sent a 6-digit code to {email}. Enter it below to trust this device for 14 days.</p>
				{error && (
					<div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
						{error}
					</div>
				)}
				{success && (
					<div className={`rounded-md p-3 text-sm ${
						success.includes("trusted")
							? "bg-green-500/15 text-green-700 dark:text-green-400"
							: "bg-blue-500/15 text-blue-700 dark:text-blue-400"
					}`}>
						{success}
					</div>
				)}
				<Input
					inputMode="numeric"
					placeholder="Enter 6-digit code"
					value={code}
					onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
				/>
				<div className="flex gap-2">
					<Button className="flex-1" onClick={onVerify} disabled={verifying || code.length !== 6}>
						{verifying ? "Verifying..." : "Verify device"}
					</Button>
					<Button
						variant="outline"
						onClick={async () => {
							if (sending) return;
							setSending(true);
							setError(null);
							setSuccess(null);
							try {
								const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/auth/device/start`, {
									method: "POST",
									headers: { "Content-Type": "application/json" },
									body: JSON.stringify({ email, deviceId }),
								});
								if (res.ok) {
									setSuccess("Code re-sent. Please check your email.");
								} else {
									setError("Failed to resend code. Please try again.");
								}
							} catch {
								setError("Failed to resend code. Please try again.");
							} finally {
								setSending(false);
							}
						}}
						disabled={sending}
					>
						Resend code
					</Button>
				</div>
			</div>
		</AuthPage>
	);
}


