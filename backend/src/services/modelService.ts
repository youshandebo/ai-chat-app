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
      console.log(`[ModelService] ✅ 优先使用主API地址: ${model.apiBase}`);
      const primaryModel = {
        ...model,
        _isFallbackAttempt: true
      };

      // 使用较长的超时时间
      const primaryController = new AbortController();
      const primaryTimeoutId = setTimeout(() => {
        console.log(`[ModelService] ⚠️ 主API超时，即将回退到备用地址: ${model.apiBaseBackup}`);
        primaryController.abort();
      }, 15000); // 15秒超时

      try {
        const result = await callModelAPI(primaryModel, messages, apiKey, onChunk, primaryController.signal, webSearch);
        clearTimeout(primaryTimeoutId);
        console.log(`[ModelService] ✅ 主API成功完成`);
        return result;
      } catch (err) {
        clearTimeout(primaryTimeoutId);
        console.warn(`[ModelService] ⚠️ 主API失败:`, String(err).slice(0, 200));
        // 继续执行备用逻辑
        throw err;
      }
    } catch (e) {
      console.warn(`[ModelService] ⚠️ 主API异常，回退到备用地址:`, String(e).slice(0, 200));

      // 使用备用API重试
      try {
        console.log(`[ModelService] 🔄 尝试备用API地址: ${model.apiBaseBackup}`);
        const backupModel = {
          ...model,
          apiBase: model.apiBaseBackup,
          _isFallbackAttempt: true
        };

        const backupController = new AbortController();
        const backupTimeoutId = setTimeout(() => {
          console.log(`[ModelService] ⚠️ 备用API超时`);
          backupController.abort();
        }, 15000);

        try {
          const result = await callModelAPI(backupModel, messages, apiKey, onChunk, backupController.signal, webSearch);
          clearTimeout(backupTimeoutId);
          console.log(`[ModelService] ✅ 备用API成功完成`);
          return result;
        } catch (backupErr) {
          clearTimeout(backupTimeoutId);
          console.error(`[ModelService] ❌ 备用API也失败:`, String(backupErr).slice(0, 200));
          throw backupErr;
        }
      } catch (backupError) {
        console.error(`[ModelService] ❌ 所有API均失败`, String(backupError).slice(0, 200));
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

  // DEBUG LOG
  console.log(`[ModelService] Sending to ${model.apiBase}:`, body.length > 100 ? body.slice(0, 100) + "... [MASKED]" : body);

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

        // Some proxies (like liangjiewis.com snippet) require key in query param
        if (apiKey && model.messageFormat === "gemini" && !finalPath.includes('key=')) {
          const separator = finalPath.includes('?') ? '&' : '?';
          finalPath += `${separator}key=${apiKey}`;
        }
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
          console.log('[ModelAPI] Abort signal received, destroying connection');
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

        const contentType = String(res.headers["content-type"] || "");
        let buffer = "";
        let isSSE = contentType.includes("text/event-stream");

        console.log(`[ModelAPI] Start. Content-Type: ${contentType}, isSSE: ${isSSE}`);

        res.on("data", (chunk) => {
          const str = chunk.toString();
          console.log(`[ModelAPI Data] Chunk size: ${str.length}, content: [MASKED]`);

          buffer += str;

          // Relaxed SSE detection: verify if buffer contains "data:" pattern or starts with SSE-like structure
          if (!isSSE && (
            contentType.includes("text/event-stream") ||
            buffer.includes("data: ") ||
            buffer.includes("data:{") ||
            /data:\s?\[DONE\]/.test(buffer)
          )) {
            isSSE = true;
            console.log("[ModelAPI] SSE Detected via body sniffing or header!");
          }

          if (isSSE) {
            // Process buffer line by line
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // Keep inconsistent line in buffer

            console.log(`[ModelAPI] Processing ${lines.length} lines`);

            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed.startsWith("data:")) {
                const data = trimmed.slice(5).trim();
                console.log(`[ModelAPI] 处理data行 (长度: ${data.length})`);
                if (data === "[DONE]") {
                  console.log("[ModelAPI] ✅ 收到[DONE]信号");
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
                      console.log(`[ModelAPI] ✅ 提取到内容 (长度: ${content.length})`);
                      onChunk?.({ content, done: false });
                    } else {
                      console.log(`[ModelAPI] ⚠️ 解析成功但无content:`, JSON.stringify(parsed).slice(0, 150));
                    }
                  } catch (e) {
                    console.log("[ModelAPI] ❌ JSON解析失败", e);
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
        if (res.statusCode && res.statusCode >= 400) {
          // Consume the error body to provide meaningful debug info
          let errorBody = "";
          res.on("data", (chunk) => { errorBody += chunk; });
          res.on("end", () => {
            console.error(`[ModelAPI Error] Status: ${res.statusCode}, Body: ${errorBody.slice(0, 500)}`);
            reject(new Error(`HTTP ${res.statusCode}: ${errorBody.slice(0, 200)}`));
          });
          return;
        }
      });
      req.on("error", reject);

      // Set 30s timeout for overall request
      req.setTimeout(30000, () => {
        console.warn(`[ModelAPI] Request timeout (30s) for path: ${opts.path}`);
        req.destroy();
        reject(new Error("Request Timeout (30s)"));
      });

      req.write(body);
      req.end();
    });

  for (const p of candidates) {
    try {
      const result = await attempt(p);
      return result;
    } catch { }
  }
  throw new Error("All endpoints failed");
}