import express from "express";
import https from "https";
import http from "http";
import crypto from "crypto";
import dns from "dns";
import { promisify } from "util";
import { getModelConfig } from "../config/models";
import { logModelUsage, logCall, logError } from "../services/metrics";
import { UsageService } from "../services/usageService";
import { KeyService } from "../services/keyService";
import { logger } from "../utils/logger";
import multer from "multer";

const dnsLookup = promisify(dns.lookup);
const dnsResolve = promisify(dns.resolve4);

const router = express.Router();

// Multer for image edit (multipart/form-data)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per image
});

/**
 * Helper: check if an IP address is private/internal
 */
function isPrivateIp(ip: string): boolean {
  const ipLower = ip.toLowerCase();
  if (
    ipLower === '127.0.0.1' ||
    ipLower === '::1' ||
    ipLower === '0.0.0.0' ||
    ipLower.startsWith('10.') ||
    ipLower.startsWith('192.168.') ||
    ipLower.startsWith('169.254.')
  ) return true;
  if (ipLower.startsWith('172.')) {
    const parts = ipLower.split('.').map(Number);
    if (parts.length >= 2 && parts[1] >= 16 && parts[1] <= 31) return true;
  }
  // IPv6 mapped private IPs
  if (ipLower.startsWith('::ffff:')) {
    const inner = ipLower.slice(7);
    return isPrivateIp(inner);
  }
  // Loopback
  if (ipLower === '::' || ipLower === '0:0:0:0:0:0:0:1') return true;
  return false;
}

/**
 * Helper: validate URL to prevent SSRF attacks
 * Blocks private/internal IPs, non-HTTP protocols, and verifies DNS resolution
 */
async function isSafeExternalUrl(urlStr: string): Promise<boolean> {
  try {
    const url = new URL(urlStr);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    const hostname = url.hostname.toLowerCase();

    // Block obvious private hostnames
    if (
      hostname === 'localhost' ||
      hostname === '0.0.0.0' ||
      hostname === '::1' ||
      hostname === '[::1]' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return false;
    }

    // Block private IP literals in hostname
    if (isPrivateIp(hostname)) {
      return false;
    }

    // DNS resolution check: verify all resolved IPs are public
    // This prevents DNS rebinding attacks
    try {
      const addresses = await dnsResolve(hostname);
      for (const addr of addresses) {
        if (isPrivateIp(addr)) {
          return false;
        }
      }
    } catch {
      // If DNS fails, fall back to basic lookup
      try {
        const result = await dnsLookup(hostname);
        if (isPrivateIp(result.address)) return false;
      } catch {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Helper: find image model config by modelId
 * If allowAny is true, return a default image model config for custom API usage
 */
function getImageModel(modelId: string, allowAny: boolean = false) {
  const cfg = getModelConfig();
  let model = cfg.models.find((m: any) => m.id === modelId && m.type === "image");
  // If not found but user provides custom API, create a virtual model config
  if (!model && allowAny) {
    model = {
      id: modelId,
      name: modelId,
      type: "image",
      apiBase: "",
      enabled: true,
      creditCost: 0,
      supportsGenerate: true,
      supportsEdit: true,
      maxImages: 5,
      apiPaths: { generate: "/v1/images/generations", edit: "/v1/images/edits" },
      apiKey: "",
    };
  }
  return model;
}

/**
 * Helper: get auth headers for a model
 */
function getAuthHeaders(model: any): Record<string, string> {
  const headers: Record<string, string> = {};
  if (model.apiKey) {
    headers["Authorization"] = `Bearer ${model.apiKey}`;
  }
  return headers;
}

/**
 * Helper: make HTTP request and return parsed JSON response
 */
function makeRequest(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: Buffer | string,
  timeoutMs: number = 120000
): Promise<{ statusCode: number; body: any }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "http:" ? http : https;

    const req = client.request(
      {
        hostname: parsed.hostname,
        port: parsed.port || undefined,
        path: parsed.pathname + parsed.search,
        method,
        headers: {
          ...headers,
          Accept: "application/json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ statusCode: res.statusCode || 200, body: parsed });
          } catch {
            resolve({ statusCode: res.statusCode || 200, body: data });
          }
        });
        res.on("error", reject);
      }
    );

    req.on("error", reject);
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    req.write(body);
    req.end();
  });
}

/**
 * Helper: Build multipart/form-data body manually (no external dependency)
 */
function buildMultipartBody(
  fields: Record<string, string>,
  files: { fieldname: string; buffer: Buffer; originalname: string; mimetype: string }[]
): { body: Buffer; contentType: string } {
  const boundary = "----FormBoundary" + crypto.randomBytes(16).toString("hex");
  const parts: Buffer[] = [];

  // Add text fields
  for (const [key, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`
      )
    );
  }

  // Add file fields
  for (const file of files) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${file.fieldname}"; filename="${file.originalname}"\r\nContent-Type: ${file.mimetype}\r\n\r\n`
      )
    );
    parts.push(file.buffer);
    parts.push(Buffer.from("\r\n"));
  }

  // Closing boundary
  parts.push(Buffer.from(`--${boundary}--\r\n`));

  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

/**
 * GET /api/image/models - List available image models
 */
router.get("/image/models", (req, res) => {
  const cfg = getModelConfig();
  const imageModels = cfg.models
    .filter((m: any) => m.type === "image" && m.enabled !== false)
    .map((m: any) => ({
      id: m.id,
      name: m.name,
      supportsEdit: m.supportsEdit || false,
      supportsGenerate: m.supportsGenerate !== false,
      creditCost: m.creditCost !== undefined ? Number(m.creditCost) : 2,
      maxImages: m.maxImages || 5,
    }));
  res.json(imageModels);
});

/**
 * POST /api/image/generate - Generate images (JSON body)
 * Supports both gpt-image-2 (text-only) and gpt-image-2-all (with image URLs)
 */
router.post("/image/generate", async (req, res) => {
  const fingerprint = req.headers["x-device-fingerprint"] as string;
  if (!fingerprint) {
    return res.status(400).json({ error: "Missing identity headers" });
  }

  const ip = req.ip || req.socket.remoteAddress || "";
  const activationKey = (req.headers["x-activation-key"] as string)
    ?.trim()
    .toUpperCase();

  const {
    model: modelId,
    prompt,
    n = 1,
    size = "1024x1024",
    quality = "auto",
    format,
    image, // array of image URLs for gpt-image-2-all
    background,
    moderation,
    custom_api_base,  // User-provided relay station URL
    custom_api_key,   // User-provided API key
  } = req.body;

  const isCustomApi = !!(custom_api_base && custom_api_key);

  if (!modelId) return res.status(400).json({ error: "缺少 model 参数" });
  if (!prompt) return res.status(400).json({ error: "缺少 prompt 参数" });

  // SSRF protection: validate custom API base URL
  if (isCustomApi && !await isSafeExternalUrl(custom_api_base)) {
    return res.status(400).json({ error: "自定义API地址不合法" });
  }

  const model = getImageModel(modelId, isCustomApi);
  if (!model)
    return res
      .status(404)
      .json({ error: `图像模型 ${modelId} 不存在或未启用` });

  const creditCost = model.creditCost !== undefined ? Number(model.creditCost) : 2;

  // Skip usage limits when user provides their own API key (they use their own quota)
  let useKeyCredits = false;
  if (!isCustomApi) {
    const { allowed, remaining, role } = UsageService.checkLimit(
      fingerprint,
      ip,
      creditCost
    );

    if (!allowed) {
      if (activationKey) {
        const keyBalance = KeyService.getBalance(activationKey);
        if (keyBalance >= creditCost) {
          useKeyCredits = true;
        } else {
          return res.status(429).json({
            error: `已达到今日上限，密钥余额不足 (需要 ${creditCost} 额度)`,
          });
        }
      } else {
        return res.status(429).json({
          error: `已达到今日对话上限 (${role === "restricted" ? 10 : 25}条)`,
        });
      }
    }
  }

  logModelUsage(modelId);

  try {
    // Use custom API if provided, otherwise use model config
    const apiBase = (isCustomApi ? custom_api_base : model.apiBase || "").replace(/\/+$/, "");
    const effectiveApiKey = isCustomApi ? custom_api_key : model.apiKey;
    const apiPath = model.apiPaths?.generate || "/v1/images/generations";
    const fullUrl = apiBase + apiPath;

    const requestBody: any = {
      model: modelId,
      prompt,
      n: Math.min(Math.max(1, Number(n)), 10),
      size,
    };

    if (quality) requestBody.quality = quality;
    if (format) requestBody.format = format;
    if (background) requestBody.background = background;
    if (moderation) requestBody.moderation = moderation;

    // gpt-image-2-all style: include image URLs in JSON body
    if (image && Array.isArray(image) && image.length > 0) {
      requestBody.image = image;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
    if (effectiveApiKey) {
      headers["Authorization"] = `Bearer ${effectiveApiKey}`;
    }

    console.log(
      `[Image Generate] Model: ${modelId}, URL: ${fullUrl}, prompt: "${prompt.slice(0, 50)}..."`
    );

    const result = await makeRequest(
      fullUrl,
      "POST",
      headers,
      JSON.stringify(requestBody),
      180000 // 3 min timeout for image generation
    );

    if (result.statusCode >= 400) {
      console.error(
        `[Image Generate Error] Status: ${result.statusCode}`,
        JSON.stringify(result.body).slice(0, 500)
      );
      return res.status(result.statusCode).json({
        error:
          result.body?.error?.message ||
          result.body?.error ||
          `上游返回错误 (HTTP ${result.statusCode})`,
      });
    }

    // Track usage on success (only when not using custom API)
    if (!isCustomApi) {
      if (useKeyCredits && activationKey) {
        KeyService.useCredit(activationKey, creditCost);
      } else {
        UsageService.increment(fingerprint, creditCost);
      }
    }
    logCall();

    res.json(result.body);
  } catch (e: any) {
    logger.error(`[Image Generate Error]`, {
      error: e.message,
      modelId,
    });
    logError();
    res.status(500).json({ error: e.message || "图像生成失败" });
  }
});

/**
 * POST /api/image/edit - Edit images (multipart/form-data)
 * For /v1/images/edits endpoint
 */
router.post(
  "/image/edit",
  upload.array("image", 5),
  async (req: any, res) => {
    const fingerprint = req.headers["x-device-fingerprint"] as string;
    if (!fingerprint) {
      return res.status(400).json({ error: "Missing identity headers" });
    }

    const ip = (
      (req.headers["x-forwarded-for"] as string) ||
      req.socket.remoteAddress ||
      ""
    )
      .split(",")[0]
      .trim();
    const activationKey = (req.headers["x-activation-key"] as string)
      ?.trim()
      .toUpperCase();

    const {
      model: modelId,
      prompt,
      n = 1,
      size,
      quality,
      background,
      moderation,
      mask,
      custom_api_base,
      custom_api_key,
    } = req.body;

    const isCustomApi = !!(custom_api_base && custom_api_key);

    if (!modelId)
      return res.status(400).json({ error: "缺少 model 参数" });
    if (!prompt)
      return res.status(400).json({ error: "缺少 prompt 参数" });
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ error: "请上传至少一张图片" });

    // SSRF protection: validate custom API base URL
    if (isCustomApi && !await isSafeExternalUrl(custom_api_base)) {
      return res.status(400).json({ error: "自定义API地址不合法" });
    }

    const model = getImageModel(modelId, isCustomApi);
    if (!model)
      return res
        .status(404)
        .json({ error: `图像模型 ${modelId} 不存在或未启用` });

    const creditCost =
      model.creditCost !== undefined ? Number(model.creditCost) : 2;

    let useKeyCredits = false;
    if (!isCustomApi) {
      const { allowed, remaining, role } = UsageService.checkLimit(
        fingerprint,
        ip,
        creditCost
      );

      if (!allowed) {
        if (activationKey) {
          const keyBalance = KeyService.getBalance(activationKey);
          if (keyBalance >= creditCost) {
            useKeyCredits = true;
          } else {
            return res.status(429).json({
              error: `已达到今日上限，密钥余额不足`,
            });
          }
        } else {
          return res.status(429).json({
            error: `已达到今日对话上限`,
          });
        }
      }
    }

    logModelUsage(modelId);

    try {
      const apiBase = (isCustomApi ? custom_api_base : model.apiBase || "").replace(/\/+$/, "");
      const effectiveApiKey = isCustomApi ? custom_api_key : model.apiKey;
      const apiPath = model.apiPaths?.edit || "/v1/images/edits";
      const fullUrl = apiBase + apiPath;

      // Build multipart form data fields
      const fields: Record<string, string> = {
        prompt,
        model: modelId,
      };
      if (n) fields.n = String(n);
      if (size) fields.size = size;
      if (quality) fields.quality = quality;
      if (background) fields.background = background;
      if (moderation) fields.moderation = moderation;
      if (mask) fields.mask = mask;

      // Build file list
      const files = req.files.map((file: any) => ({
        fieldname: "image",
        buffer: file.buffer,
        originalname: file.originalname,
        mimetype: file.mimetype,
      }));

      const { body: multipartBody, contentType } = buildMultipartBody(fields, files);

      console.log(
        `[Image Edit] Model: ${modelId}, URL: ${fullUrl}, files: ${req.files.length}, prompt: "${prompt.slice(0, 50)}..."`
      );

      // Make the multipart request
      const result = await new Promise<{
        statusCode: number;
        body: any;
      }>((resolve, reject) => {
        const parsedUrl = new URL(fullUrl);
        const client = parsedUrl.protocol === "http:" ? http : https;

        const authHeaders: Record<string, string> = {};
        if (effectiveApiKey) {
          authHeaders["Authorization"] = `Bearer ${effectiveApiKey}`;
        }

        const reqOpts = {
          hostname: parsedUrl.hostname,
          port: parsedUrl.port || undefined,
          path: parsedUrl.pathname + parsedUrl.search,
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": contentType,
            "Content-Length": String(multipartBody.length),
            Accept: "application/json",
          },
        };

        const httpReq = client.request(reqOpts, (httpRes) => {
          let data = "";
          httpRes.on("data", (chunk: any) => (data += chunk));
          httpRes.on("end", () => {
            try {
              const parsed = JSON.parse(data);
              resolve({
                statusCode: httpRes.statusCode || 200,
                body: parsed,
              });
            } catch {
              resolve({
                statusCode: httpRes.statusCode || 200,
                body: data,
              });
            }
          });
          httpRes.on("error", reject);
        });

        httpReq.on("error", reject);
        httpReq.setTimeout(180000, () => {
          httpReq.destroy();
          reject(new Error("Request timeout"));
        });

        httpReq.write(multipartBody);
        httpReq.end();
      });

      if (result.statusCode >= 400) {
        console.error(
          `[Image Edit Error] Status: ${result.statusCode}`,
          JSON.stringify(result.body).slice(0, 500)
        );
        return res.status(result.statusCode).json({
          error:
            result.body?.error?.message ||
            result.body?.error ||
            `上游返回错误 (HTTP ${result.statusCode})`,
        });
      }

      // Track usage on success (only when not using custom API)
      if (!isCustomApi) {
        if (useKeyCredits && activationKey) {
          KeyService.useCredit(activationKey, creditCost);
        } else {
          UsageService.increment(fingerprint, creditCost);
        }
      }
      logCall();

      res.json(result.body);
    } catch (e: any) {
      logger.error(`[Image Edit Error]`, {
        error: e.message,
        modelId,
      });
      logError();
      res.status(500).json({ error: e.message || "图像编辑失败" });
    }
  }
);

export default router;
