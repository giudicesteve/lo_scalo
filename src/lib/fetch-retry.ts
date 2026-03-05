interface FetchRetryOptions {
  retries?: number
  retryDelay?: number
  timeout?: number
  onRetry?: (attempt: number, error: Error) => void
}

class FetchTimeoutError extends Error {
  constructor(message = "Request timeout") {
    super(message)
    this.name = "FetchTimeoutError"
  }
}

class FetchRetryExhaustedError extends Error {
  constructor(public readonly errors: Error[]) {
    super(`All ${errors.length} retry attempts failed`)
    this.name = "FetchRetryExhaustedError"
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === "AbortError") {
      throw new FetchTimeoutError()
    }
    throw error
  }
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: FetchRetryOptions = {}
): Promise<Response> {
  const {
    retries = 3,
    retryDelay = 1000,
    timeout = 10000,
    onRetry,
  } = retryOptions

  const errors: Error[] = []

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout)
      
      // Se la risposta è 5xx, retry
      if (response.status >= 500 && attempt < retries) {
        const error = new Error(`Server error: ${response.status}`)
        errors.push(error)
        
        if (onRetry) {
          onRetry(attempt + 1, error)
        }
        
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
        continue
      }
      
      return response
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      errors.push(err)

      // Non fare retry su errori 4xx (client error)
      if (err.message.includes("4")) {
        throw err
      }

      // Ultimo tentativo fallito
      if (attempt >= retries) {
        throw new FetchRetryExhaustedError(errors)
      }

      if (onRetry) {
        onRetry(attempt + 1, err)
      }

      // Exponential backoff: 1s, 2s, 3s...
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
    }
  }

  throw new FetchRetryExhaustedError(errors)
}

// Helper specifico per API admin con retry silenzioso
export async function fetchAdminAPI(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetchWithRetry(url, options, {
    retries: 2,
    retryDelay: 1000,
    timeout: 15000, // 15s per API admin (possono essere lente)
  })
}

// Helper per API pubbliche con retry
export async function fetchPublicAPI(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetchWithRetry(url, options, {
    retries: 1,
    retryDelay: 500,
    timeout: 8000,
  })
}
