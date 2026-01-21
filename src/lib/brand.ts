/**
 * Branded types utility for compile-time type safety.
 *
 * Branded types let you create distinct types from primitives that can't
 * be accidentally mixed up, even though they have the same runtime representation.
 *
 * @example
 * type UserId = Brand<string, 'UserId'>
 * type ChannelId = Brand<string, 'ChannelId'>
 *
 * // These are both strings at runtime, but TypeScript treats them as incompatible
 * const userId = 'U123' as UserId
 * const channelId = 'C456' as ChannelId
 *
 * function getUser(id: UserId): User { ... }
 * getUser(channelId)  // Compile error!
 * getUser(userId)     // Works
 */
declare const __brand: unique symbol

export type Brand<T, B extends string> = T & {readonly [__brand]: B}
