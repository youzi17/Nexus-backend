/**
 * 重试配置接口
 */
export interface RetryOptions {
  maxRetries: number; // 最大重试次数
  delayMs: number; // 重试延迟（毫秒）
  backoff?: boolean; // 是否使用指数退避
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带重试的异步函数执行器
 * @param fn 要执行的异步函数
 * @param options 重试配置
 * @returns 函数执行结果
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxRetries, delayMs, backoff = true } = options;
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // 如果是最后一次尝试，直接抛出错误
      if (attempt === maxRetries) {
        throw lastError;
      }

      // 计算延迟时间（指数退避或固定延迟）
      const currentDelay = backoff ? delayMs * Math.pow(2, attempt) : delayMs;

      // 等待后重试
      await delay(currentDelay);
    }
  }

  // 理论上不会到达这里，但为了类型安全
  throw lastError!;
}
