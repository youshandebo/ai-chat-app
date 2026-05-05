import https from "https";
import http from "http";

export async function callModelAPI(
  model: any,
  messages: any,
  apiKey: string | undefined,
  onChunk?: (chunk: { content: string; done: boolean }) => void,
  abortSignal?: AbortSignal,
  webSearch: boolean = false
): Promise<any> {
  if (model.id === "deepseek-openai-mock") {
    const lastUser = Array.isArray(messages) ? [...messages].reverse().find((m: any) => m.role === "user") : null;
    const baseReply = lastUser?.content ? `好的，已收到：${lastUser.content}` : "你好，我是模拟回复";
    if (onChunk) {
      const parts = baseReply.match(/.{1,8}/g) || [baseReply];
      for (const p of parts) {
        await new Promise((r) => setTimeout(r, 40));
        onChunk({ content: p, done: false });
      }
      return { content: baseReply } as any;
    } else {
      return { content: baseReply } as any;
    }
  }
  // Priority fallback for Gemini 2.5 Flash and Gemini 2.5 Pro - try backup endpoint if primary fails
  if ((model.id === 'gemini-2.5-flash' || model.id === 'gemini-2.5-pro' || model.id === 'gemini-2.5-flash-sf') && model.apiBaseBackup && !(model as any)._isFallbackAttempt) {
    try {
      const primaryModel = {
        ...model,
        _isFallbackAttempt: true
      };

      const primaryController = new AbortController();
      const primaryTimeoutId = setTimeout(() => {
        primaryController.abort();
      }, 15000);

      try {
        const result = await callModelAPI(primaryModel, messages, apiKey, onChunk, primaryController.signal, webSearch);
        clearTimeout(primaryTimeoutId);
        return result;
      } catch (err) {
        clearTimeout(primaryTimeoutId);
        throw err;
      }
    } catch (e) {
      // Fallback to backup API
      try {
        const backupModel = {
          ...model,
          apiBase: model.apiBaseBackup,
          _isFallbackAttempt: true
        };

        const backupController = new AbortController();
        const backupTimeoutId = setTimeout(() => {
          backupController.abort();
        }, 15000);

        try {
          const result = await callModelAPI(backupModel, messages, apiKey, onChunk, backupController.signal, webSearch);
          clearTimeout(backupTimeoutId);
          return result;
        } catch (backupErr) {
          clearTimeout(backupTimeoutId);
          throw backupErr;
        }
      } catch (backupError) {
        throw backupError;
      }
    }
  }

  // Build request body with optional web_search parameter
  const requestBody: any = model.messageFormat === "gemini"
    ? messages
    : {
      model: model.id,
      messages,
      stream: true,
      temperature: model.defaultParams?.temperature,
      max_tokens: model.defaultParams?.maxTokens,
    };

  // Add web_search if enabled and model supports it
  if (webSearch && model.supportsWebSearch && model.messageFormat !== "gemini") {
    requestBody.web_search = true;
  }

  const body = JSON.stringify(requestBody);

  // DEBUG LOG (only in development)
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[ModelService] Sending to ${model.apiBase}:`, body.length > 100 ? body.slice(0, 100) + "... [MASKED]" : body);
  }

  const base = new URL(model.apiBase);
  const candidates: string[] = [];

  // 1. Try custom path from config if provided
  if (model.apiPaths?.chat) candidates.push(model.apiPaths.chat);
  if ((model.apiPaths as any)?.chat_alt) candidates.push((model.apiPaths as any).chat_alt);

  // 2. Format-specific defaults
  if (model.messageFormat === "gemini") {
    // Try both beta and v1 versions, as well as streaming/non-streaming candidates
    candidates.push(`/v1beta/models/${model.id}:streamGenerateContent`);
    candidates.push(`/v1/models/${model.id}:streamGenerateContent`);
    candidates.push(`/models/${model.id}:streamGenerateContent`);
    // Fallbacks for non-streaming if above fail
    candidates.push(`/v1beta/models/${model.id}:generateContent`);
    candidates.push(`/v1/models/${model.id}:generateContent`);
  } else {
    candidates.push("/v1/chat/completions");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "text/event-stream, application/json"
  };

  if (apiKey) {
    if (model.messageFormat === "gemini") {
      headers["x-goog-api-key"] = apiKey;
    } else {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }
  }

  const clientFactory = (p: string) => {
    const opts = {
      protocol: base.protocol,
      hostname: base.hostname,
      port: base.port || undefined,
      path: (() => {
        const basePath = (base.pathname || "/").replace(/\/$/, "");
        let finalPath = p.startsWith(basePath) ? p : (basePath + (p.startsWith("/") ? p : `/${p}`));

        // API key is sent via x-goog-api-key header, not URL param (security)
        return finalPath;
      })(),
      method: "POST",
      headers,
    } as any;
    return { opts, client: (opts.protocol === "http:" ? http : https) as typeof https };
  };

  const attempt = (p: string) =>
    new Promise<any>((resolve, reject) => {
      const { opts, client } = clientFactory(p);
      const req = client.request(opts, (res) => {
        // If signal is already aborted, destroy immediately
        if (abortSignal?.aborted) {
          res.destroy();
          req.destroy();
          return reject(new Error('Aborted'));
        }

        // Listen for abort signal to destroy connection
        const abortHandler = () => {
          res.destroy();
          req.destroy();
          reject(new Error('Aborted by client'));
        };
        abortSignal?.addEventListener('abort', abortHandler, { once: true });

        // Clean up abort listener when response ends
        res.on('end', () => {
          abortSignal?.removeEventListener('abort', abortHandler);
        });
        res.on('error', () => {
          abortSignal?.removeEventListener('abort', abortHandler);
        });

        // Handle HTTP errors FIRST, before registering normal data handlers
        if (res.statusCode && res.statusCode >= 400) {
          let errorBody = "";
          res.on("data", (chunk) => { errorBody += chunk; });
          res.on("end", () => {
            // Extract meaningful error message from upstream
            let errorMsg = "";
            try {
              const errParsed = JSON.parse(errorBody);
              errorMsg = errParsed?.error?.message || errParsed?.error || errParsed?.message || "";
            } catch { }
            const errText = errorMsg || errorBody.slice(0, 200);
            const err = new Error(`HTTP ${res.statusCode}: ${errText}`);
            (err as any).statusCode = res.statusCode;
            reject(err);
          });
          res.on("error", reject);
          return;
        }

        const contentType = String(res.headers["content-type"] || "");
        let buffer = "";
        let isSSE = contentType.includes("text/event-stream");

        res.on("data", (chunk) => {
          const str = chunk.toString();

          buffer += str;

          // Relaxed SSE detection: verify if buffer contains "data:" pattern or starts with SSE-like structure
          if (!isSSE && (
            contentType.includes("text/event-stream") ||
            buffer.includes("data: ") ||
            buffer.includes("data:{") ||
            /data:\s?\[DONE\]/.test(buffer)
          )) {
            isSSE = true;
          }

          if (isSSE) {
            // Process buffer line by line
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep inconsistent line in buffer

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data:")) {
                const data = trimmed.slice(5).trim();
                if (data === "[DONE]") {
                  onChunk?.({ content: "", done: true });
                  resolve(null);
                } else {
                  try {
                    const parsed = JSON.parse(data);
                    const content =
                      parsed.choices?.[0]?.delta?.content ||
                      parsed.content ||
                      parsed.candidates?.[0]?.content?.parts?.[0]?.text ||
                      "";

                    if (content) {
                      onChunk?.({ content, done: false });
                    }
                  } catch (e) {
                    // Skip unparseable SSE lines
                  }
                }
              }
            }
          }
        });
        res.on("end", () => {
          if (!isSSE) {
            try {
              const parsed = JSON.parse(buffer);
              const content =
                parsed.choices?.[0]?.message?.content ||
                parsed.content ||
                parsed.candidates?.[0]?.content?.parts?.[0]?.text ||
                "";
              if (content && onChunk) onChunk({ content, done: false });
              resolve(null);
            } catch {
              if (buffer && onChunk) onChunk({ content: buffer, done: false });
              resolve(null);
            }
          } else {
            resolve(null);
          }
        });
        res.on("error", reject);
      });
      req.on("error", reject);

      // Set 30s timeout for overall request
      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error("Request Timeout (30s)"));
      });

      req.write(body);
      req.end();
    });

  // Try candidate paths, but only fallback to next path on 404 (Not Found).
  // For other errors (401, 403, 429, 500, etc.), throw immediately to avoid
  // duplicate API calls and charges.
  let lastError: Error | null = null;
  for (const p of candidates) {
    try {
      const result = await attempt(p);
      return result;
    } catch (err: any) {
      lastError = err;
      const statusCode = err?.statusCode;
      // Only retry on 404 (path not found) - other errors mean the API was reached
      // but rejected the request, so retrying with a different path would cause
      // duplicate charges
      if (statusCode && statusCode !== 404) {
        throw err;
      }
    }
  }
  throw lastError || new Error("All endpoints failed");
}