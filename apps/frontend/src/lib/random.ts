/**
 * Frontend random utility that uses backend Random.org service
 * Falls back to Math.random() if backend is unavailable
 */

/**
 * Generate random integers using backend Random.org service
 */
export async function randomInt(min: number, max: number): Promise<number> {
  try {
    const response = await fetch('/api/random/int', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ min, max }),
    });

    if (!response.ok) {
      throw new Error('Random service unavailable');
    }

    const data = await response.json();
    return data.value;
  } catch (error) {
    console.warn('[Random] Backend unavailable, using Math.random() fallback');
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

/**
 * Shuffle an array using backend Random.org service
 */
export async function shuffleArray<T>(array: T[]): Promise<T[]> {
  if (array.length <= 1) return [...array];

  try {
    const response = await fetch('/api/random/shuffle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ array }),
    });

    if (!response.ok) {
      throw new Error('Random service unavailable');
    }

    const data = await response.json();
    return data.shuffled;
  } catch (error) {
    console.warn('[Random] Backend unavailable, using Math.random() fallback');
    // Fallback to Math.random shuffle
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}

/**
 * Coin flip (returns 0 or 1)
 */
export async function coinFlip(): Promise<0 | 1> {
  try {
    const response = await fetch('/api/random/coinflip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Random service unavailable');
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.warn('[Random] Backend unavailable, using Math.random() fallback');
    return Math.random() < 0.5 ? 0 : 1;
  }
}

/**
 * Select n random items from an array
 */
export async function selectRandom<T>(array: T[], n: number): Promise<T[]> {
  if (n >= array.length) {
    return await shuffleArray(array);
  }

  const shuffled = await shuffleArray(array);
  return shuffled.slice(0, n);
}

