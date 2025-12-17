export function transformMessages(messages: any[], targetFormat: string) {
  // DEBUG LOG
  if (targetFormat === "openai") console.log(`[Transform] Formatting ${messages.length} messages for ${targetFormat}`);

  if (targetFormat === "openai") {
    return messages.map(m => ({
      role: m.role,
      content: m.content
    }));
  }
  if (targetFormat === "gemini") {
    const contents = messages.map((msg) => {
      let role = msg.role === "assistant" ? "model" : "user";
      let text = msg.content;
      if (msg.role === "system") {
        role = "user";
        text = `System: ${msg.content}`;
      }
      return { role, parts: [{ text }] };
    });
    if (contents.length > 0 && contents[0].role === "model") {
      contents.unshift({ role: "user", parts: [{ text: "System instructions provided." }] });
    }
    return { contents };
  }
  return messages;
}