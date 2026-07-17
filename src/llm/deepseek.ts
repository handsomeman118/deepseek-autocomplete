import { FimRequest, FimResponse, CompletionContext, CompletionOptions } from './types';
import { buildFimPrompt } from './prompt';
import { ConfigManager } from '../config';

export class DeepSeekClient {
  constructor(private config: ConfigManager) {}

  /**
   * 调用 DeepSeek FIM API 获取补全
   */
  async complete(
    ctx: CompletionContext,
    apiKey: string,
    options: CompletionOptions
  ): Promise<string> {
    const { prompt, suffix } = buildFimPrompt(ctx);
    const baseUrl = this.config.endpoint.replace(/\/+$/, '');
    const url = `${baseUrl}/completions`;

    const body: FimRequest = {
      model: this.config.model,
      prompt,
      suffix: suffix || undefined,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      stream: false,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const error = new Error(`DeepSeek API error: ${response.status} ${errorText}`);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    const data = await response.json() as FimResponse;
    return data.choices?.[0]?.text ?? '';
  }

  /**
   * 流式调用 DeepSeek FIM API
   */
  async stream(
    ctx: CompletionContext,
    apiKey: string,
    options: CompletionOptions
  ): Promise<string> {
    const { prompt, suffix } = buildFimPrompt(ctx);
    const baseUrl = this.config.endpoint.replace(/\/+$/, '');
    const url = `${baseUrl}/completions`;

    const body: FimRequest = {
      model: this.config.model,
      prompt,
      suffix: suffix || undefined,
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      stream: true,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: options.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const error = new Error(`DeepSeek API error: ${response.status} ${errorText}`);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    // SSE 流式读取
    if (!response.body) {
      throw new Error('DeepSeek API returned an empty response body');
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let result = '';

    let finished = false;
    while (!finished) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop()!;

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') {
          finished = true;
          break;
        }
        try {
          const json = JSON.parse(data);
          result += json.choices?.[0]?.text ?? '';
        } catch {
          // skip malformed chunks
        }
      }
    }

    if (finished) await reader.cancel().catch(() => undefined);

    return result;
  }
}
