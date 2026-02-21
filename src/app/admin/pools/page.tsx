import PoolManagement from '@/components/admin/pool-management'
import { getPools } from '@/app/admin/actions/pools'

export default async function PoolManagementPage() {
    const pools = await getPools()

    return (
        <div className="container mx-auto max-w-6xl py-6">
            <PoolManagement initialPools={pools} />
        </div>
    )
}
