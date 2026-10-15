const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse bg-gray-soft rounded-xl ${className}`} />
)

export const SkeletonCard = () => (
    <div className="bg-white rounded-2xl border border-pastel p-4">
        <div className="flex items-center gap-4">
            <Skeleton className="w-11 h-11 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
        </div>
    </div>
)

export const SkeletonDetail = () => (
    <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-pastel p-6">
            <div className="flex items-center gap-4">
                <Skeleton className="w-16 h-16 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                </div>
            </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
        </div>
        <div className="bg-white rounded-2xl border border-pastel p-6 space-y-4">
            <Skeleton className="h-5 w-1/3" />
            <div className="grid grid-cols-2 gap-4">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="space-y-1">
                        <Skeleton className="h-3 w-1/3" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                ))}
            </div>
        </div>
    </div>
)

export const SkeletonHCEntry = () => (
    <div className="bg-white rounded-2xl border border-pastel p-5 space-y-3">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <Skeleton className="w-7 h-7 rounded-lg" />
                <Skeleton className="h-4 w-36" />
            </div>
            <Skeleton className="h-6 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
    </div>
)

export const SkeletonList = ({ count = 5, Card = SkeletonCard }) => (
    <div className="space-y-3">
        {[...Array(count)].map((_, i) => (
            <Card key={i} />
        ))}
    </div>
)

export default Skeleton
