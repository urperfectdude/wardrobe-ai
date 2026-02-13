import React from 'react'
import { LinkSimple, ShoppingBag } from '@phosphor-icons/react'

const ShopSuggestions = ({ items, loading, error }) => {
    if (loading) {
        return (
            <div className="p-4 rounded-lg border border-border bg-card/50">
                <div className="flex items-center gap-2 mb-3">
                    <ShoppingBag className="w-5 h-5 animate-pulse text-accent" />
                    <span className="text-sm font-medium text-muted-foreground">Finding matching items...</span>
                </div>
                <div className="flex gap-4 overflow-hidden">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="min-w-[140px] h-[180px] bg-muted/20 animate-pulse rounded-md" />
                    ))}
                </div>
            </div>
        )
    }

    if (error) return null

    if (!items || items.length === 0) return null

    return (
        <div className="mt-6 mb-8">
            <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-accent" />
                    Shop the Look
                </h3>
                <span className="text-xs text-muted-foreground">Powered by AI Search</span>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide snap-x">
                {items.map((item, idx) => (
                    <a
                        key={idx}
                        href={item.product_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 min-w-[150px] w-[150px] p-2 rounded-lg border border-border bg-card hover:border-accent/50 transition-colors group snap-start"
                    >
                        <div className="aspect-[3/4] mb-2 overflow-hidden rounded-md bg-white relative">
                            {item.image_url ? (
                                <img
                                    src={item.image_url}
                                    alt={item.title}
                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                                    loading="lazy"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-300">
                                    <ShoppingBag size={24} />
                                </div>
                            )}
                            {item.source && (
                                <span className="absolute bottom-1 right-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded backdrop-blur-sm">
                                    {item.source}
                                </span>
                            )}
                        </div>

                        <div className="space-y-1">
                            <h4 className="text-sm font-medium line-clamp-2 min-h-[2.5em] leading-tight" title={item.title}>
                                {item.title}
                            </h4>
                            <div className="flex items-center justify-between pt-1">
                                <span className="text-sm font-bold text-accent">
                                    {item.price}
                                </span>
                                <LinkSimple className="w-4 h-4 text-muted-foreground group-hover:text-foreground" />
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    )
}

export default ShopSuggestions
