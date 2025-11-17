import { Skeleton } from "@/components/ui/skeleton";

export default function OtpLoading() {
	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<div className="w-full max-w-md space-y-6">
				<Skeleton className="h-7 w-40 mx-auto" />
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



