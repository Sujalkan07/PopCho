import { io, Socket } from 'socket.io-client';
import { getDevUserHeaders, type MessageRecord, type ReactionRecord } from './api';

let socket: Socket | null = null;

const SOCKET_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5000'
    : '';

export function getCommunitySocket(): Socket {
  if (!socket) {
    const headers = getDevUserHeaders();
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      autoConnect: true,
      auth: {
        userId: headers['x-user-id'],
        userName: headers['x-user-name'],
        userAvatar: headers['x-user-avatar'],
        userRole: headers['x-user-role'],
      },
    });

    socket.on('connect', () => {
      console.log('[PopCho Socket] Connected with ID:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[PopCho Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[PopCho Socket] Connection error:', err.message);
    });
  }

  return socket;
}

export function joinChannelRoom(channelId: string): void {
  const s = getCommunitySocket();
  if (s.connected) {
    s.emit('join_channel', { channelId });
  } else {
    s.once('connect', () => {
      s.emit('join_channel', { channelId });
    });
  }
}

export function leaveChannelRoom(channelId: string): void {
  const s = getCommunitySocket();
  if (s.connected) {
    s.emit('leave_channel', { channelId });
  }
}

export function subscribeToMessages(callback: (msg: MessageRecord) => void): () => void {
  const s = getCommunitySocket();
  const handler = (data: { message: MessageRecord }) => {
    if (data && data.message) {
      callback(data.message);
    }
  };
  s.on('new_message', handler);
  return () => {
    s.off('new_message', handler);
  };
}

export function subscribeToReactions(
  callback: (data: { messageId: string; reactions: ReactionRecord[] }) => void
): () => void {
  const s = getCommunitySocket();
  const handler = (data: { messageId: string; reactions: ReactionRecord[] }) => {
    callback(data);
  };
  s.on('reaction_updated', handler);
  return () => {
    s.off('reaction_updated', handler);
  };
}

export function subscribeToPresence(
  callback: (data: { channelId: string; onlineCount: number }) => void
): () => void {
  const s = getCommunitySocket();
  const handler = (data: { channelId: string; onlineCount: number }) => {
    callback(data);
  };
  s.on('presence_update', handler);
  return () => {
    s.off('presence_update', handler);
  };
}

export function emitSendMessage(
  channelId: string,
  content: string,
  isSpoiler: boolean = false
): Promise<{ success: boolean; message?: MessageRecord; error?: string }> {
  const s = getCommunitySocket();
  return new Promise((resolve) => {
    s.emit(
      'send_message',
      { channelId, content, isSpoiler },
      (res: { success: boolean; message?: MessageRecord; error?: string }) => {
        resolve(res);
      }
    );
  });
}

export function emitToggleReaction(
  messageId: string,
  channelId: string,
  emoji: string
): Promise<{ success: boolean; reactions?: ReactionRecord[]; error?: string }> {
  const s = getCommunitySocket();
  return new Promise((resolve) => {
    s.emit(
      'toggle_reaction',
      { messageId, channelId, emoji },
      (res: { success: boolean; reactions?: ReactionRecord[]; error?: string }) => {
        resolve(res);
      }
    );
  });
}
