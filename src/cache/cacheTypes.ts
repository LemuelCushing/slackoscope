// Currently unused but reserved for future use
// export interface CacheConfig<T> {
//   name: string
//   maxSize?: number // Optional eviction (for future)
// }

export interface Cache<T> {
  get(key: string): T | undefined
  set(key: string, value: T): void
  has(key: string): boolean
  clear(): void
  size: number
}
