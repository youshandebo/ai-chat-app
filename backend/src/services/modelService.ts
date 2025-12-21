import https from "https";
import http from "http";

export async function callModelAPI(
  model: any,
  messages: any,
  apiKey: string | undefined,
  onChunk?: (chunk: { content: string; done: boolean }) => void,
  abortSignal?: AbortSignal
) {
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
  const body =
    model.messageFormat === "gemini"
      ? JSON.stringify(messages)
      : JSON.stringify({
        model: model.id,
        messages,
        stream: true,
        temperature: model.defaultParams?.temperature,
        max_tokens: model.defaultParams?.maxTokens,
      });

  // DEBUG LOG
  console.log(`[ModelService] Sending to ${model.apiBase}:`, body.slice(0, 500));

  const base = new URL(model.apiBase);
  const candidates: string[] = [];
  if (model.apiPaths?.chat) candidates.push(model.apiPaths.chat);
  if ((model.apiPaths as any)?.chat_alt) candidates.push((model.apiPaths as any).chat_alt);
  if (model.messageFormat === "gemini") {
    candidates.push("/models/gemini-2.5-flash:streamGenerateContent");
    candidates.push("/models/gemini-2.0-flash:streamGenerateContent");
  } else {
    candidates.push("/v1/chat/completions");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "Accept": "text/event-stream, application/json"
  };
  if (apiKey) {
    if (model.messageFormat === "gemini") headers["x-goog-api-key"] = apiKey;
    else headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const clientFactory = (p: string) => {
    const opts = {
      protocol: base.protocol,
      hostname: base.hostname,
      port: base.port || undefined,
      path: (() => {
        const basePath = (base.pathname || "/").replace(/\/$/, "");
        if (p.startsWith(basePath)) return p;
        return basePath + (p.startsWith("/") ? p : `/${p}`);
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
          console.log(`[ModelAPI Data] Chunk size: ${str.length}, content: ${JSON.stringify(str.slice(0, 50))}`);

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
                if (data === "[DONE]") {
                  console.log("[ModelAPI] Stream [DONE]");
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
                    } else {
                      console.log("[ModelAPI] Parsed JSON but no content found", JSON.stringify(parsed).slice(0, 100));
                    }
                  } catch (e) {
                    console.log("[ModelAPI] JSON Parse Error", e);
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