import {exec} from 'child_process'
import {promisify} from 'util'

const execAsync = promisify(exec)

export class OnePasswordApi {
  private cache = new Map<string, string>()

  async isAvailable(): Promise<boolean> {
    try {
      await execAsync('op --version')
      return true
    } catch {
      return false
    }
  }

  async readSecret(reference: string): Promise<string> {
    if (!reference.startsWith('op://')) {
      // Not a 1Password reference, return as-is
      return reference
    }

    // Check cache
    const cached = this.cache.get(reference)
    if (cached) return cached

    try {
      const {stdout} = await execAsync(`op read "${reference}"`)
      const value = stdout.trim()

      // Cache in memory
      this.cache.set(reference, value)

      return value
    } catch (error) {
      throw new Error(`Failed to read from 1Password: ${error}`)
    }
  }

  clearCache(): void {
    this.cache.clear()
  }
}
