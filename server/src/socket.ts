import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import { chatService } from './services/chat.service.js';
import { DEFAULT_DEV_USER } from './middleware/auth.middleware.js';
import { serverSupabase, isServerSupabaseConfigured } from './services/supabase.service.js';
import { config } from './config.js';
import prisma from './db/prisma.js';

interface SocketUser {
  id: string;
  name: string;
  avatar: string;
  role: string;
}

export function initSocketServer(httpServer: HttpServer, allowedOrigins: string[]) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
          (origin.endsWith('.vercel.app') && origin.includes('popcho'))
        ) {
          return callback(null, true);
        }
        return callback(new Error('CORS origin denied'), false);
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Cryptographically verified authentication & handshake middleware
  io.use(async (socket: Socket, next) => {
    try {
      const auth = socket.handshake.auth || {};
      const headers = socket.handshake.headers || {};

      const rawToken =
        auth.token ||
        (typeof headers.authorization === 'string' && headers.authorization.startsWith('Bearer ')
          ? headers.authorization.substring(7).trim()
          : undefined);

      // 1. Verify Supabase JWT token cryptographically
      if (rawToken && isServerSupabaseConfigured && serverSupabase) {
        const { data, error } = await serverSupabase.auth.getUser(rawToken);
        if (error || !data.user) {
          return next(new Error('Authentication failed: Invalid token'));
        }

        const u = data.user;
        const meta = u.user_metadata || {};
        const name = meta.full_name || meta.name || u.email?.split('@')[0] || 'PopCho Fan';
        const avatar = meta.avatar_url || meta.picture || DEFAULT_DEV_USER.avatar;

        let role = 'Community Member';
        try {
          const profile = await prisma.profile.findUnique({ where: { id: u.id } });
          if (profile?.role) {
            role = profile.role;
          }
        } catch {
          // ignore DB lookup failure
        }

        socket.data.user = {
          id: u.id,
          name,
          avatar,
          role,
        } as SocketUser;

        return next();
      }

      // 2. Local dev auth bypass (gated strictly by ENABLE_DEV_AUTH_BYPASS in non-production)
      if (config.enableDevAuthBypass) {
        const userId = (auth.userId || headers['x-user-id'] || DEFAULT_DEV_USER.id) as string;
        const name = (auth.userName || headers['x-user-name'] || DEFAULT_DEV_USER.name) as string;
        const avatar = (auth.userAvatar || headers['x-user-avatar'] || DEFAULT_DEV_USER.avatar) as string;
        const role = (auth.userRole || headers['x-user-role'] || DEFAULT_DEV_USER.role) as string;

        socket.data.user = {
          id: userId.trim(),
          name: name.trim(),
          avatar: avatar.trim(),
          role: role.trim(),
        } as SocketUser;

        return next();
      }

      if (rawToken) {
        return next(new Error('Authentication failed: Invalid token'));
      }

      return next(new Error('Authentication required: Missing token'));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      return next(new Error(msg));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as SocketUser;
    if (!user) {
      socket.disconnect(true);
      return;
    }
    console.log(`[Socket.IO] Client connected: ${socket.id} (user: ${user.name} [${user.id}])`);


    /**
     * Join channel room with database validation
     */
    socket.on(
      'join_channel',
      async (
        { channelId }: { channelId: string },
        callback?: (res: { success: boolean; error?: string }) => void
      ) => {
        if (!channelId) {
          callback?.({ success: false, error: 'channelId is required' });
          return;
        }

        // Validate channel exists in PostgreSQL
        const channel = await chatService.getChannelById(channelId);
        if (!channel) {
          callback?.({ success: false, error: 'Channel not found' });
          return;
        }

        const room = `channel:${channelId}`;
        socket.join(room);

        // Count clients in room for presence
        const roomClients = io.sockets.adapter.rooms.get(room);
        const onlineCount = roomClients ? roomClients.size : 1;

        io.to(room).emit('presence_update', {
          channelId,
          onlineCount,
        });

        callback?.({ success: true });
      }
    );

    /**
     * Leave channel room
     */
    socket.on('leave_channel', ({ channelId }: { channelId: string }) => {
      if (!channelId) return;
      const room = `channel:${channelId}`;
      socket.leave(room);

      const roomClients = io.sockets.adapter.rooms.get(room);
      const onlineCount = roomClients ? roomClients.size : 0;

      io.to(room).emit('presence_update', {
        channelId,
        onlineCount,
      });
    });

    /**
     * Send message: saves to DB first, then broadcasts to all clients in room
     */
    socket.on(
      'send_message',
      async (
        payload: {
          channelId: string;
          content: string;
          isSpoiler?: boolean;
        },
        callback?: (res: { success: boolean; message?: unknown; error?: string }) => void
      ) => {
        try {
          const { channelId, content, isSpoiler } = payload;
          if (!channelId || !content || !content.trim()) {
            callback?.({ success: false, error: 'Channel ID and content are required' });
            return;
          }

          // Persist to PostgreSQL
          const message = await chatService.createMessage({
            channelId,
            userId: user.id,
            content,
            isSpoiler,
            userName: user.name,
            userAvatar: user.avatar,
            userRole: user.role,
          });

          // Broadcast to other clients in channel room (sender receives via callback)
          const room = `channel:${channelId}`;
          socket.to(room).emit('new_message', { message });

          callback?.({ success: true, message });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to send message';
          console.error('[Socket.IO] send_message error:', err);
          callback?.({ success: false, error: msg });
        }
      }
    );

    /**
     * Toggle reaction: updates DB, then broadcasts to all clients in room
     */
    socket.on(
      'toggle_reaction',
      async (
        payload: {
          messageId: string;
          channelId: string;
          emoji: string;
        },
        callback?: (res: { success: boolean; reactions?: unknown; error?: string }) => void
      ) => {
        try {
          const { messageId, channelId, emoji } = payload;
          if (!messageId || !channelId || !emoji) {
            callback?.({ success: false, error: 'messageId, channelId, and emoji required' });
            return;
          }

          const result = await chatService.toggleReaction({
            messageId,
            userId: user.id,
            emoji,
          });

          // Broadcast updated reactions to channel room
          const room = `channel:${channelId}`;
          io.to(room).emit('reaction_updated', {
            messageId: result.messageId,
            reactions: result.reactions,
          });

          callback?.({ success: true, reactions: result.reactions });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to toggle reaction';
          console.error('[Socket.IO] toggle_reaction error:', err);
          callback?.({ success: false, error: msg });
        }
      }
    );

    /**
     * Typing indicators
     */
    socket.on('typing_start', ({ channelId }: { channelId: string }) => {
      if (!channelId) return;
      socket.to(`channel:${channelId}`).emit('user_typing', {
        channelId,
        user: { id: user.id, name: user.name },
      });
    });

    socket.on('typing_stop', ({ channelId }: { channelId: string }) => {
      if (!channelId) return;
      socket.to(`channel:${channelId}`).emit('user_stopped_typing', {
        channelId,
        user: { id: user.id, name: user.name },
      });
    });

    socket.on('disconnecting', () => {
      for (const room of socket.rooms) {
        if (room.startsWith('channel:')) {
          const channelId = room.replace('channel:', '');
          const roomClients = io.sockets.adapter.rooms.get(room);
          const onlineCount = roomClients ? Math.max(0, roomClients.size - 1) : 0;
          socket.to(room).emit('presence_update', {
            channelId,
            onlineCount,
          });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}
