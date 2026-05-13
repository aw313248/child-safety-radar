// 拿鐵媽媽 rating → CSS color token
// 集中一處，避免各組件各自散落 hex literal
export type DimRating = '優' | '良' | '普' | '不建議'

export function ratingToColor(rating: DimRating): string {
  switch (rating) {
    case '優':     return 'var(--risk-green)'
    case '良':     return 'var(--risk-green)'
    case '普':     return 'var(--risk-orange)'
    case '不建議': return 'var(--risk-red)'
  }
}
