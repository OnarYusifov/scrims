import { Skeleton } from "@/components/ui/skeleton";

export default function VerifyEmailLoading() {
	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<div className="w-full max-w-md space-y-6">
				<Skeleton className="h-7 w-48 mx-auto" />
				<div className="space-y-2">
					<Skeleton className="h-4 w-3/4 mx-auto" />
					<Skeleton className="h-4 w-2/3 mx-auto" />
				</div>
				<div className="grid grid-cols-6 gap-2">
					{Array.from({ length: 6 }).map((_, i) => (
						<Skeleton key={i} className="h-12" />
					))}
				</div>
				<Skeleton className="h-10 w-full" />
			</div>
		</div>
	);
}



