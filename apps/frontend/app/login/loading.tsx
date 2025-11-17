import { Skeleton } from "@/components/ui/skeleton";

export default function LoginLoading() {
	return (
		<main className="relative h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
			<div className="relative hidden h-full flex-col border-r bg-secondary p-10 lg:flex dark:bg-secondary/20">
				<div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
				<Skeleton className="h-8 w-28" />
			</div>
			<div className="relative flex h-screen flex-col justify-center overflow-hidden p-4">
				<div className="mx-auto w-full max-w-sm space-y-6 py-4">
					<Skeleton className="h-8 w-28 lg:hidden" />
					<div className="flex flex-col space-y-1">
						<Skeleton className="h-7 w-40" />
						<Skeleton className="h-4 w-52" />
					</div>
					<div className="flex gap-2">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
					<div className="space-y-3">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
				</div>
			</div>
		</main>
	);
}



