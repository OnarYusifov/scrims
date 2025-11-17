import { Skeleton } from "@/components/ui/skeleton";

export default function RootLoading() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="w-full max-w-md space-y-4 p-6">
				<Skeleton className="h-6 w-32 mx-auto" />
				<div className="space-y-2">
					<Skeleton className="h-4 w-3/4 mx-auto" />
					<Skeleton className="h-4 w-2/3 mx-auto" />
				</div>
				<Skeleton className="h-10 w-40 mx-auto" />
			</div>
		</div>
	);
}



