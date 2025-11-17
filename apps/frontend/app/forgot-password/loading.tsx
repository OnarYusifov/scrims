import { Skeleton } from "@/components/ui/skeleton";

export default function ForgotPasswordLoading() {
	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<div className="w-full max-w-sm space-y-6">
				<Skeleton className="h-7 w-56 mx-auto" />
				<Skeleton className="h-10 w-full" />
				<Skeleton className="h-10 w-full" />
			</div>
		</div>
	);
}



