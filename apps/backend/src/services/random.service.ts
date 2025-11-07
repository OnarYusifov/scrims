/**
 * Random.org service for true randomness
 * Uses Random.org API v4 (JSON-RPC)
 * Free tier: 1,000,000 bits/day
 */

interface RandomOrgResponse {
  jsonrpc: string;
  result?: {
    random: {
      data: number[];
      completionTime: string;
    };
    bitsUsed: number;
    bitsLeft: number;
    requestsLeft: number;
    advisoryDelay: number;
  };
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id: number;
}

class RandomService {
  private apiKey: string | null;
  private baseUrl = 'https://api.random.org/json-rpc/4/invoke';
  private fallbackToMathRandom = true; // Fallback if API fails

  constructor() {
    this.apiKey = process.env.RANDOM_ORG_API_KEY || null;
    
    if (!this.apiKey) {
      console.warn('[RandomService] RANDOM_ORG_API_KEY not set. Falling back to Math.random()');
    }
  }

  /**
   * Generate random integers using Random.org API
   * @param n Number of integers to generate
   * @param min Minimum value (inclusive)
   * @param max Maximum value (inclusive)
   * @returns Array of random integers
   */
  async generateIntegers(n: number, min: number, max: number): Promise<number[]> {
    if (!this.apiKey) {
      // Fallback to Math.random
      return Array.from({ length: n }, () => 
        Math.floor(Math.random() * (max - min + 1)) + min
      );
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'generateIntegers',
          params: {
            apiKey: this.apiKey,
            n,
            min,
            max,
            replacement: true, // Allow duplicates
          },
          id: Date.now(),
        }),
      });

      const data: RandomOrgResponse = await response.json();

      if (data.error) {
        console.error('[RandomService] API error:', data.error);
        if (this.fallbackToMathRandom) {
          return Array.from({ length: n }, () => 
            Math.floor(Math.random() * (max - min + 1)) + min
          );
        }
        throw new Error(`Random.org API error: ${data.error.message}`);
      }

      if (!data.result?.random?.data) {
        throw new Error('Invalid response from Random.org');
      }

      return data.result.random.data;
    } catch (error) {
      console.error('[RandomService] Request failed:', error);
      if (this.fallbackToMathRandom) {
        console.warn('[RandomService] Falling back to Math.random()');
        return Array.from({ length: n }, () => 
          Math.floor(Math.random() * (max - min + 1)) + min
        );
      }
      throw error;
    }
  }

  /**
   * Generate a single random integer
   */
  async randomInt(min: number, max: number): Promise<number> {
    const [result] = await this.generateIntegers(1, min, max);
    return result;
  }

  /**
   * Generate a random float between 0 and 1
   */
  async randomFloat(): Promise<number> {
    // Random.org doesn't support floats directly, so we generate a large integer
    // and divide by max to get a float between 0 and 1
    const [result] = await this.generateIntegers(1, 0, 1000000);
    return result / 1000000;
  }

  /**
   * Shuffle an array using true randomness
   * Uses Fisher-Yates shuffle with random.org integers
   */
  async shuffleArray<T>(array: T[]): Promise<T[]> {
    const arr = [...array];
    const n = arr.length;

    if (n <= 1) return arr;

    // Generate all random indices we need
    const randomIndices = await this.generateIntegers(n - 1, 0, n - 1);

    // Fisher-Yates shuffle
    for (let i = n - 1; i > 0; i--) {
      const j = randomIndices[i - 1] % (i + 1); // Use modulo to ensure j <= i
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
  }

  /**
   * Coin flip (returns 0 or 1)
   */
  async coinFlip(): Promise<0 | 1> {
    const [result] = await this.generateIntegers(1, 0, 1);
    return result as 0 | 1;
  }

  /**
   * Select n random items from an array
   */
  async selectRandom<T>(array: T[], n: number): Promise<T[]> {
    if (n >= array.length) {
      return await this.shuffleArray(array);
    }

    const shuffled = await this.shuffleArray(array);
    return shuffled.slice(0, n);
  }
}

// Singleton instance
export const randomService = new RandomService();

