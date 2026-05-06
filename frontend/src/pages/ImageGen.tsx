import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getFingerprint } from "../utils/fingerprint";
import { getStoredKeys } from "../utils/keyStorage";
import SEO from "../components/SEO";
import {
  Image as ImageIcon,
  Upload,
  Wand2,
  X,
  Download,
  Loader2,
  ChevronDown,
  Check,
  Sparkles,
  Settings2,
  Maximize2,
  Palette,
  Layers,
  RefreshCw,
} from "lucide-react";

type ImageModel = {
  id: string;
  name: string;
  supportsEdit: boolean;
  supportsGenerate: boolean;
  creditCost: number;
  maxImages: number;
};

type GeneratedImage = {
  url?: string;
  b64_json?: string;
  revised_prompt?: string;
};

const SIZE_OPTIONS = [
  { value: "auto", label: "自动", icon: "🔄" },
  { value: "1024x1024", label: "1024×1024 正方形", icon: "⬜" },
  { value: "1536x1024", label: "1536×1024 横版", icon: "▬" },
  { value: "1024x1536", label: "1024×1536 竖版", icon: "▮" },
];

const QUALITY_OPTIONS = [
  { value: "auto", label: "自动" },
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

const BACKGROUND_OPTIONS = [
  { value: "auto", label: "自动" },
  { value: "transparent", label: "透明" },
  { value: "opaque", label: "不透明" },
];

export default function ImageGen() {
  const [models, setModels] = useState<ImageModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [prompt, setPrompt] = useState("");
  const [uploadedImages, setUploadedImages] = useState<
    { file: File; preview: string }[]
  >([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [size, setSize] = useState("1024x1024");
  const [quality, setQuality] = useState("auto");
  const [background, setBackground] = useState("auto");
  const [numImages, setNumImages] = useState(1);
  const [customApiBase, setCustomApiBase] = useState("");
  const [customApiKey, setCustomApiKey] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  // Load models
  useEffect(() => {
    // @ts-ignore
    const apiBase = import.meta.env.VITE_BACKEND_BASE || "";
    fetch(`${apiBase}/api/image/models`)
      .then((r) => r.json())
      .then((data) => {
        setModels(data);
        if (data.length > 0) setSelectedModel(data[0].id);
      })
      .catch((e) => setError("加载图像模型失败: " + e.message));
  }, []);

  // Click outside to close model dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(event.target as Node)
      ) {
        setShowModelDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentModel = models.find((m) => m.id === selectedModel);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxImages = currentModel?.maxImages || 5;
    const remaining = maxImages - uploadedImages.length;

    Array.from(files)
      .slice(0, remaining)
      .forEach((file) => {
        if (file.size > 25 * 1024 * 1024) {
          setError("单张图片不能超过 25MB");
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          setUploadedImages((prev) => [
            ...prev,
            { file, preview: reader.result as string },
          ]);
        };
        reader.readAsDataURL(file);
      });

    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeImageUrl = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const addImageUrl = () => {
    setImageUrls((prev) => [...prev, ""]);
  };

  const updateImageUrl = (index: number, url: string) => {
    setImageUrls((prev) => prev.map((u, i) => (i === index ? url : u)));
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("请输入图片描述");
      return;
    }
    if (!selectedModel) {
      setError("请选择模型");
      return;
    }

    setIsGenerating(true);
    setError("");
    setResults([]);
    const startTime = Date.now();

    try {
      const fingerprint = await getFingerprint();
      const storedKeys = getStoredKeys();
      const lastKey = storedKeys.length > 0 ? storedKeys[storedKeys.length - 1] : undefined;

      // @ts-ignore
      const apiBase = import.meta.env.VITE_BACKEND_BASE || "";

      // Determine if we should use the generation or edit endpoint
      const hasImages = uploadedImages.length > 0;
      const hasImageUrls = imageUrls.filter((u) => u.trim()).length > 0;

      if (hasImages && currentModel?.supportsEdit) {
        // Use edit endpoint with multipart form data
        const formData = new FormData();
        formData.append("model", selectedModel);
        formData.append("prompt", prompt);
        formData.append("n", String(numImages));
        if (size !== "auto") formData.append("size", size);
        if (quality !== "auto") formData.append("quality", quality);
        if (background !== "auto") formData.append("background", background);
        if (customApiBase.trim()) formData.append("custom_api_base", customApiBase.trim());
        if (customApiKey.trim()) formData.append("custom_api_key", customApiKey.trim());

        uploadedImages.forEach((img) => {
          formData.append("image", img.file);
        });

        const res = await fetch(`${apiBase}/api/image/edit`, {
          method: "POST",
          headers: {
            "X-Device-Fingerprint": fingerprint,
            "X-Activation-Key": lastKey || "",
          },
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        processResults(data);
      } else {
        // Use generate endpoint with JSON body
        const body: any = {
          model: selectedModel,
          prompt,
          n: numImages,
          size,
          quality,
        };

        if (background !== "auto") body.background = background;
        if (customApiBase.trim()) body.custom_api_base = customApiBase.trim();
        if (customApiKey.trim()) body.custom_api_key = customApiKey.trim();

        // If model supports image URLs (gpt-image-2-all style)
        if (hasImageUrls) {
          body.image = imageUrls.filter((u) => u.trim());
        }

        const res = await fetch(`${apiBase}/api/image/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Device-Fingerprint": fingerprint,
            "X-Activation-Key": lastKey || "",
          },
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        processResults(data);
      }

      setGenerationTime(Math.round((Date.now() - startTime) / 1000));
    } catch (e: any) {
      setError(e.message || "图像生成失败");
    } finally {
      setIsGenerating(false);
    }
  };

  const processResults = (data: any) => {
    // Handle different response formats
    if (data.data && Array.isArray(data.data)) {
      setResults(data.data);
    } else if (data.choices) {
      // chat-completion style response with base64
      const images = data.choices
        .map((c: any) => ({
          b64_json: c.message?.content,
          url: c.message?.content,
        }))
        .filter((i: any) => i.b64_json || i.url);
      setResults(images);
    } else {
      setError("无法解析返回结果");
    }
  };

  const getImageSrc = (img: GeneratedImage) => {
    if (img.url) return img.url;
    if (img.b64_json) return `data:image/png;base64,${img.b64_json}`;
    return "";
  };

  const downloadImage = async (img: GeneratedImage, index: number) => {
    const src = getImageSrc(img);
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `generated-image-${Date.now()}-${index}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Fallback for cross-origin
      window.open(src, "_blank");
    }
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-purple-50/30 to-blue-50/20 dark:from-dark-bg dark:via-dark-bg dark:to-dark-bg">
      <SEO title="AI 图像生成" description="使用AI模型生成高质量图像，支持文生图、图生图，多种尺寸和质量选项。" />
      {/* Header */}
      <div className="sticky top-0 z-30 backdrop-blur-xl bg-white/70 dark:bg-dark-card/70 border-b border-gray-200/50 dark:border-dark-border/50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">
                AI 图像工坊
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                GPT Image 2 · 文生图 & 图生图
              </p>
            </div>
          </div>

          {/* Model Selector */}
          <div className="relative" ref={modelDropdownRef}>
            <button
              onClick={() => setShowModelDropdown(!showModelDropdown)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl text-sm hover:border-violet-400 dark:hover:border-violet-500 transition-all shadow-sm"
            >
              <Palette className="w-4 h-4 text-violet-500" />
              <span className="text-gray-700 dark:text-gray-300 max-w-[160px] truncate">
                {currentModel?.name || "选择模型"}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-gray-400 transition-transform ${showModelDropdown ? "rotate-180" : ""}`}
              />
            </button>
            <AnimatePresence>
              {showModelDropdown && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -8 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25, mass: 0.8 }}
                  className="absolute right-0 top-full mt-2 min-w-[260px] bg-white/95 dark:bg-dark-card/95 backdrop-blur-xl border border-gray-200/60 dark:border-dark-border/40 rounded-3xl shadow-2xl shadow-black/10 dark:shadow-black/30 z-50 py-1.5 overflow-hidden"
                >
                  {models.map((m, index) => (
                    <button
                      key={m.id}
                      onClick={() => {
                        setSelectedModel(m.id);
                        setShowModelDropdown(false);
                      }}
                      className={`w-full text-left mx-1.5 px-3 py-3 text-sm flex items-center justify-between transition-all duration-150 rounded-xl ${m.id === selectedModel ? "text-violet-600 font-medium bg-violet-50/70 dark:bg-violet-900/15" : "text-gray-700 dark:text-gray-300 hover:bg-violet-50/50 dark:hover:bg-violet-900/10"}`}
                      style={{ width: 'calc(100% - 12px)' }}
                    >
                      <div>
                        <span>{m.name}</span>
                        <div className="flex gap-1 mt-0.5">
                          {m.supportsGenerate && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300">
                              文生图
                            </span>
                          )}
                          {m.supportsEdit && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300">
                              图生图
                            </span>
                          )}
                        </div>
                      </div>
                      {m.id === selectedModel && (
                        <Check className="w-4 h-4 text-violet-500 shrink-0" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-2 space-y-4">
            {/* Prompt Input */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-dark-card rounded-3xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden"
            >
              <div className="p-4 pb-0">
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Wand2 className="w-4 h-4 text-violet-500" />
                  图片描述
                </label>
                <textarea
                  ref={promptRef}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="描述你想要生成的图片...&#10;例如：一只可爱的猫咪坐在窗台上，窗外是下雨的城市夜景，赛博朋克风格"
                  className="w-full h-32 resize-none bg-gray-50 dark:bg-dark-bg rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-dark-text placeholder-gray-400 dark:placeholder-gray-500 outline-none border border-transparent focus:border-violet-300 dark:focus:border-violet-600 transition-colors"
                />
                <div className="flex justify-between items-center mt-1 px-1">
                  <span className="text-[11px] text-gray-400">
                    {prompt.length} / 32000
                  </span>
                </div>
              </div>

              {/* Image Upload Section */}
              {currentModel?.supportsEdit && (
                <div className="p-4 pt-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Upload className="w-4 h-4 text-blue-500" />
                    上传参考图片
                    <span className="text-[11px] text-gray-400 font-normal">
                      (可选, 最多{currentModel?.maxImages || 5}张)
                    </span>
                  </label>

                  {/* Uploaded Image Previews */}
                  {uploadedImages.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {uploadedImages.map((img, i) => (
                        <div
                          key={i}
                          className="relative group w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-dark-border"
                        >
                          <img
                            src={img.preview}
                            alt={`上传 ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => removeImage(i)}
                            className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={
                      uploadedImages.length >=
                      (currentModel?.maxImages || 5)
                    }
                    className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-dark-border rounded-2xl text-sm text-gray-500 dark:text-gray-400 hover:border-violet-400 hover:text-violet-500 dark:hover:border-violet-500 dark:hover:text-violet-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    点击或拖拽上传图片
                  </button>
                </div>
              )}

              {/* Image URL Section (for gpt-image-2-all) */}
              {currentModel?.supportsEdit && (
                <div className="p-4 pt-0">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Layers className="w-4 h-4 text-emerald-500" />
                    图片链接
                    <span className="text-[11px] text-gray-400 font-normal">
                      (或使用 URL 代替上传)
                    </span>
                  </label>
                  {imageUrls.map((url, i) => (
                    <div key={i} className="flex items-center gap-2 mb-2">
                      <input
                        type="text"
                        value={url}
                        onChange={(e) => updateImageUrl(i, e.target.value)}
                        placeholder="https://example.com/image.png"
                        className="flex-1 bg-gray-50 dark:bg-dark-bg rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-dark-text outline-none border border-gray-200 dark:border-dark-border focus:border-violet-400"
                      />
                      <button
                        onClick={() => removeImageUrl(i)}
                        className="p-2 text-red-400 hover:text-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={addImageUrl}
                    className="text-xs text-violet-500 hover:text-violet-700 font-medium flex items-center gap-1"
                  >
                    + 添加图片链接
                  </button>
                </div>
              )}

              {/* Generate Button */}
              <div className="p-4 pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !prompt.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white rounded-2xl font-medium text-sm transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      生成中...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      生成图片
                    </>
                  )}
                </button>
              </div>
            </motion.div>

            {/* Settings Panel */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-dark-card rounded-3xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden"
            >
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-bg transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-gray-400" />
                  高级设置
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${showSettings ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 pt-0 space-y-4">
                      {/* Size */}
                      <div>
                        <label className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                          <Maximize2 className="w-3.5 h-3.5" />
                          尺寸
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {SIZE_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setSize(opt.value)}
                              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                                size === opt.value
                                  ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-2 border-violet-300 dark:border-violet-600"
                                  : "bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-gray-400 border-2 border-transparent hover:border-gray-200 dark:hover:border-dark-border"
                              }`}
                            >
                              {opt.icon} {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Quality */}
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                          画质
                        </label>
                        <div className="flex gap-2">
                          {QUALITY_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setQuality(opt.value)}
                              className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                                quality === opt.value
                                  ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-2 border-violet-300 dark:border-violet-600"
                                  : "bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-gray-400 border-2 border-transparent hover:border-gray-200 dark:hover:border-dark-border"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Background */}
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                          背景
                        </label>
                        <div className="flex gap-2">
                          {BACKGROUND_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => setBackground(opt.value)}
                              className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                                background === opt.value
                                  ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-2 border-violet-300 dark:border-violet-600"
                                  : "bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-gray-400 border-2 border-transparent hover:border-gray-200 dark:hover:border-dark-border"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Number of images */}
                      <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                          生成数量
                        </label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4].map((n) => (
                            <button
                              key={n}
                              onClick={() => setNumImages(n)}
                              className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                                numImages === n
                                  ? "bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 border-2 border-violet-300 dark:border-violet-600"
                                  : "bg-gray-50 dark:bg-dark-bg text-gray-600 dark:text-gray-400 border-2 border-transparent hover:border-gray-200 dark:hover:border-dark-border"
                              }`}
                            >
                              {n}张
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-gray-100 dark:border-dark-border pt-4 mt-2">
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                          自定义 API 设置 (可选)
                        </label>
                        <div className="space-y-3">
                          <div>
                            <input
                              type="text"
                              value={customApiBase}
                              onChange={(e) => setCustomApiBase(e.target.value)}
                              placeholder="自定义接口地址 (如 https://api.example.com)"
                              className="w-full bg-gray-50 dark:bg-dark-bg rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-dark-text outline-none border border-gray-200 dark:border-dark-border focus:border-violet-400 transition-colors"
                            />
                          </div>
                          <div>
                            <input
                              type="password"
                              value={customApiKey}
                              onChange={(e) => setCustomApiKey(e.target.value)}
                              placeholder="自定义 API Key (sk-...)"
                              className="w-full bg-gray-50 dark:bg-dark-bg rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-dark-text outline-none border border-gray-200 dark:border-dark-border focus:border-violet-400 transition-colors"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">
                              *填入后将使用您的 Key 扣费，不消耗本站额度
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-white dark:bg-dark-card rounded-3xl shadow-sm border border-gray-100 dark:border-dark-border overflow-hidden min-h-[400px] flex flex-col"
            >
              {/* Results Header */}
              <div className="px-4 py-3 border-b border-gray-100 dark:border-dark-border/60 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  <ImageIcon className="w-4 h-4 text-violet-500" />
                  生成结果
                  {generationTime !== null && results.length > 0 && (
                    <span className="text-[11px] text-gray-400 font-normal">
                      · 用时 {generationTime}s
                    </span>
                  )}
                </span>
                {results.length > 0 && (
                  <button
                    onClick={() => {
                      setResults([]);
                      setGenerationTime(null);
                    }}
                    className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    清除
                  </button>
                )}
              </div>

              {/* Content Area */}
              <div className="flex-1 p-4">
                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl text-sm text-red-600 dark:text-red-400 flex items-center justify-between"
                    >
                      <span>❌ {error}</span>
                      <button onClick={() => setError("")}>
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Loading State */}
                {isGenerating && (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-500 to-fuchsia-500 animate-pulse flex items-center justify-center">
                        <Sparkles className="w-8 h-8 text-white animate-spin" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-400 rounded-full animate-ping" />
                    </div>
                    <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 animate-pulse">
                      AI 正在创作你的图片...
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      通常需要 10-60 秒
                    </p>
                  </div>
                )}

                {/* Empty State */}
                {!isGenerating && results.length === 0 && !error && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30 flex items-center justify-center mb-4">
                      <ImageIcon className="w-10 h-10 text-violet-400 dark:text-violet-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      开始创作
                    </h3>
                    <p className="text-sm text-gray-400 dark:text-gray-500 max-w-xs">
                      在左侧输入图片描述，选择参数后点击"生成图片"
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2 justify-center">
                      {[
                        "赛博朋克城市",
                        "水彩风景画",
                        "可爱卡通角色",
                        "产品展示图",
                      ].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => {
                            setPrompt(suggestion);
                            promptRef.current?.focus();
                          }}
                          className="px-3 py-1.5 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-full text-xs hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
                        >
                          ✨ {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Generated Images Grid */}
                {results.length > 0 && (
                  <div
                    className={`grid gap-4 ${results.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}
                  >
                    {results.map((img, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="group relative rounded-2xl overflow-hidden border-2 border-gray-100 dark:border-dark-border hover:border-violet-300 dark:hover:border-violet-600 transition-all shadow-sm hover:shadow-lg"
                      >
                        <img
                          src={getImageSrc(img)}
                          alt={img.revised_prompt || `生成图片 ${i + 1}`}
                          className="w-full h-auto object-contain bg-gray-50/50 dark:bg-dark-bg cursor-pointer"
                          onClick={() =>
                            setLightboxImage(getImageSrc(img))
                          }
                        />
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => downloadImage(img, i)}
                              className="px-3 py-1.5 bg-white/90 hover:bg-white rounded-xl text-xs font-medium text-gray-800 flex items-center gap-1 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                              下载
                            </button>
                            <button
                              onClick={() =>
                                setLightboxImage(getImageSrc(img))
                              }
                              className="px-3 py-1.5 bg-white/90 hover:bg-white rounded-xl text-xs font-medium text-gray-800 flex items-center gap-1 transition-colors"
                            >
                              <Maximize2 className="w-3.5 h-3.5" />
                              查看
                            </button>
                          </div>
                        </div>
                        {/* Revised Prompt */}
                        {img.revised_prompt && (
                          <div className="absolute top-2 left-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-black/70 backdrop-blur-sm rounded-xl px-3 py-2 text-[11px] text-white/80 line-clamp-2">
                              {img.revised_prompt}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
            onClick={() => setLightboxImage(null)}
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={lightboxImage}
              alt="预览"
              className="max-w-full max-h-full object-contain rounded-xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
