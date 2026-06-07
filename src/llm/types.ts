// DeepSeek FIM API 类型定义

export interface FimRequest {
  model: string;
  prompt: string;
  suffix?: string;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  stop?: string | string[] | null;
  echo?: boolean;
  logprobs?: number;
}

export interface FimChoice {
  text: string;
  index: number;
  logprobs: null | Record<string, unknown>;
  finish_reason: string;
}

export interface FimUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  prompt_cache_hit_tokens: number;
  prompt_cache_miss_tokens: number;
  completion_tokens_details?: {
    reasoning_tokens: number;
  };
}

export interface FimResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: FimChoice[];
  usage: FimUsage;
}

export interface CompletionContext {
  language: string;
  fileName: string;
  relativePath: string;
  prefix: string;
  suffix: string;
  precedingLines: string[];
  followingLines: string[];
  imports: string[];
  cursorLine: number;
  cursorColumn: number;
}

export interface CompletionOptions {
  signal: AbortSignal;
}

export interface Config {
  enabled: boolean;
  endpoint: string;
  apiKey: string;
  model: string;
  maxTokens: number;
  temperature: number;
  debounceMs: number;
  contextLinesBefore: number;
  contextLinesAfter: number;
  maxLines: number;
  enabledLanguages: string[];
  disabledLanguages: string[];
  nesEnabled: boolean;
  nesDebounceMs: number;
  nesTimeout: number;
  nesUseLlm: boolean;
}

export interface EditRecord {
  document: string;
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  oldText: string;
  newText: string;
  timestamp: number;
}

export interface RenameInfo {
  oldName: string;
  newName: string;
  changeRange: { start: { line: number; character: number }; end: { line: number; character: number } };
}

export interface PendingEdit {
  document: string;
  range: { start: { line: number; character: number }; end: { line: number; character: number } };
  newText: string;
  timestamp: number;
}
