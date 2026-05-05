import { describe, it, expect, beforeEach } from 'vitest';
import { useChatStore } from './useChatStore';

beforeEach(() => {
  // Reset store to initial state
  useChatStore.setState({
    chats: [],
    tags: [],
    currentChatId: null,
    settings: { theme: 'auto', sidebarCollapsed: false },
  });
  // Clear localStorage
  localStorage.clear();
});

describe('useChatStore', () => {
  it('creates a new chat', () => {
    const { createChat } = useChatStore.getState();
    createChat('gemini-2.5-flash');

    const state = useChatStore.getState();
    expect(state.chats).toHaveLength(1);
    expect(state.chats[0].modelId).toBe('gemini-2.5-flash');
    expect(state.chats[0].title).toBe('新对话');
    expect(state.chats[0].messages).toEqual([]);
    expect(state.currentChatId).toBe(state.chats[0].id);
  });

  it('adds a message to a chat', () => {
    const { createChat, addMessage } = useChatStore.getState();
    createChat('gemini-2.5-flash');
    const chatId = useChatStore.getState().currentChatId!;

    addMessage(chatId, {
      id: 'msg_1',
      role: 'user',
      content: 'Hello',
      timestamp: Date.now(),
    });

    const chat = useChatStore.getState().chats.find(c => c.id === chatId);
    expect(chat?.messages).toHaveLength(1);
    expect(chat?.messages[0].content).toBe('Hello');
  });

  it('updates a message', () => {
    const { createChat, addMessage, updateMessage } = useChatStore.getState();
    createChat('gemini-2.5-flash');
    const chatId = useChatStore.getState().currentChatId!;

    addMessage(chatId, { id: 'msg_1', role: 'user', content: 'Hello', timestamp: Date.now() });
    updateMessage(chatId, 'msg_1', 'Updated');

    const chat = useChatStore.getState().chats.find(c => c.id === chatId);
    expect(chat?.messages[0].content).toBe('Updated');
  });

  it('sets current chat', () => {
    const { createChat, setCurrentChat } = useChatStore.getState();
    createChat('gemini-2.5-flash');
    const firstId = useChatStore.getState().currentChatId!;
    createChat('gemini-2.5-pro');
    const secondId = useChatStore.getState().currentChatId!;

    setCurrentChat(firstId);
    expect(useChatStore.getState().currentChatId).toBe(firstId);
  });

  it('updates chat model', () => {
    const { createChat, updateChatModel } = useChatStore.getState();
    createChat('gemini-2.5-flash');
    const chatId = useChatStore.getState().currentChatId!;

    updateChatModel(chatId, 'gemini-2.5-pro');
    expect(useChatStore.getState().chats[0].modelId).toBe('gemini-2.5-pro');
  });

  it('sets theme', () => {
    const { setTheme } = useChatStore.getState();
    setTheme('dark');
    expect(useChatStore.getState().settings.theme).toBe('dark');
  });

  it('renames a chat', () => {
    const { createChat, renameChat } = useChatStore.getState();
    createChat('gemini-2.5-flash');
    const chatId = useChatStore.getState().currentChatId!;

    renameChat(chatId, 'Custom Title');
    expect(useChatStore.getState().chats[0].title).toBe('Custom Title');
  });

  it('deletes a chat', () => {
    const { deleteChat } = useChatStore.getState();
    useChatStore.setState({
      chats: [
        { id: 'chat_1', title: 'First', modelId: 'gemini-2.5-flash', messages: [], tags: [], createdAt: 1, updatedAt: 1 },
        { id: 'chat_2', title: 'Second', modelId: 'gemini-2.5-pro', messages: [], tags: [], createdAt: 2, updatedAt: 2 },
      ],
      currentChatId: 'chat_1',
    });

    deleteChat('chat_1');
    expect(useChatStore.getState().chats).toHaveLength(1);
    expect(useChatStore.getState().chats[0].id).toBe('chat_2');
  });

  it('deletes current chat and updates currentChatId', () => {
    const { deleteChat } = useChatStore.getState();
    useChatStore.setState({
      chats: [
        { id: 'chat_only', title: 'Only', modelId: 'gemini-2.5-flash', messages: [], tags: [], createdAt: 1, updatedAt: 1 },
      ],
      currentChatId: 'chat_only',
    });

    deleteChat('chat_only');
    expect(useChatStore.getState().currentChatId).toBeNull();
  });

  it('deletes a single message', () => {
    const { createChat, addMessage, deleteMessage } = useChatStore.getState();
    createChat('gemini-2.5-flash');
    const chatId = useChatStore.getState().currentChatId!;

    addMessage(chatId, { id: 'msg_1', role: 'user', content: 'A', timestamp: 1 });
    addMessage(chatId, { id: 'msg_2', role: 'assistant', content: 'B', timestamp: 2 });
    deleteMessage(chatId, 'msg_1');

    const chat = useChatStore.getState().chats.find(c => c.id === chatId);
    expect(chat?.messages).toHaveLength(1);
    expect(chat?.messages[0].id).toBe('msg_2');
  });

  it('deletes messages after a given message', () => {
    const { createChat, addMessage, deleteMessagesAfter } = useChatStore.getState();
    createChat('gemini-2.5-flash');
    const chatId = useChatStore.getState().currentChatId!;

    addMessage(chatId, { id: 'msg_1', role: 'user', content: 'A', timestamp: 1 });
    addMessage(chatId, { id: 'msg_2', role: 'assistant', content: 'B', timestamp: 2 });
    addMessage(chatId, { id: 'msg_3', role: 'user', content: 'C', timestamp: 3 });
    deleteMessagesAfter(chatId, 'msg_2');

    const chat = useChatStore.getState().chats.find(c => c.id === chatId);
    expect(chat?.messages).toHaveLength(1);
    expect(chat?.messages[0].id).toBe('msg_1');
  });
});
