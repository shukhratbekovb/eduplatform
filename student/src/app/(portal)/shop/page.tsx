'use client'
import { useT } from '@/lib/i18n'
import { useDashboard } from '@/lib/hooks/student'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api/axios'
import { Star, Gem, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { toast } from 'sonner'

export default function ShopPage() {
  const t    = useT()
  const qc   = useQueryClient()

  const { data: dashboard } = useDashboard()
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['shop', 'items'],
    queryFn: () => apiClient.get('/gamification/shop').then((r) => r.data as any[]),
  })

  const purchase = useMutation({
    mutationFn: (itemId: string) =>
      apiClient.post('/gamification/shop/purchase', { item_id: itemId }).then((r) => r.data),
    onSuccess: (data: any) => {
      toast.success(`${t('shop.purchased')}: ${data.item}`)
      qc.invalidateQueries({ queryKey: ['student', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['shop'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || t('shop.purchaseError')
      toast.error(msg)
    },
  })

  const stars    = dashboard?.stars ?? 0
  const crystals = dashboard?.crystals ?? 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          <ShoppingCart className="w-6 h-6 inline-block mr-2 text-primary-600" />
          {t('shop.shopTitle')}
        </h1>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1 text-sm font-medium text-warning-600">
            <Star className="w-4 h-4 fill-warning-400 text-warning-400" />
            {stars}
          </span>
          <span className="flex items-center gap-1 text-sm font-medium text-cyan-600">
            <Gem className="w-4 h-4" />
            {crystals}
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 h-44 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-60 text-gray-400">
          <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
          <p className="text-sm">{t('shop.shopEmpty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item: any) => {
            const canAfford = stars >= item.cost_stars && crystals >= item.cost_crystals
            const outOfStock = item.stock !== null && item.stock <= 0
            const disabled = !canAfford || outOfStock

            return (
              <div key={item.id} className={cn(
                'bg-white rounded-xl border border-gray-200 p-5 flex flex-col transition-all',
                disabled ? 'opacity-60' : 'hover:shadow-md hover:border-primary-200'
              )}>
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="text-sm font-bold text-gray-900">{item.name}</h3>
                <p className="text-xs text-gray-400 mt-1 flex-1">{item.description}</p>

                <div className="flex items-center gap-3 mt-3 mb-3">
                  {item.cost_stars > 0 && (
                    <span className={cn('flex items-center gap-0.5 text-sm font-semibold',
                      stars >= item.cost_stars ? 'text-warning-600' : 'text-red-500'
                    )}>
                      <Star className="w-3.5 h-3.5 fill-current" />
                      {item.cost_stars}
                    </span>
                  )}
                  {item.cost_crystals > 0 && (
                    <span className={cn('flex items-center gap-0.5 text-sm font-semibold',
                      crystals >= item.cost_crystals ? 'text-cyan-600' : 'text-red-500'
                    )}>
                      <Gem className="w-3.5 h-3.5" />
                      {item.cost_crystals}
                    </span>
                  )}
                  {item.stock !== null && (
                    <span className="text-xs text-gray-400 ml-auto">
                      {item.stock > 0
                        ? `${t('shop.stockLeft')}: ${item.stock}`
                        : t('shop.outOfStock')}
                    </span>
                  )}
                </div>

                <Button
                  className="w-full"
                  size="sm"
                  disabled={disabled || purchase.isPending}
                  onClick={() => purchase.mutate(item.id)}
                >
                  {outOfStock
                    ? t('shop.outOfStock')
                    : !canAfford
                    ? t('shop.notEnough')
                    : t('shop.buy')}
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
