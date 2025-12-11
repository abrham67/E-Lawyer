import React, { useEffect, useRef, useState } from "react";
import { Paperclip, Send, File as FileIcon, Image as ImageIcon, SmilePlus } from "lucide-react";
import io from "socket.io-client";
// Prefer same-origin path via Vite proxy to reduce ad-block interference
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "/";

type ChatProps = { user: any; recipient: any };

const Chat = ({ user, recipient }: ChatProps) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string>("");
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const deliveredAcksRef = useRef<Set<string>>(new Set());
  const readAcksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Connect to Socket.IO server
    socketRef.current = io(SOCKET_URL, {
      auth: { token: localStorage.getItem("token") },
      path: "/ws/socket.io",
      query: { userId: user?.id },
    });
    socketRef.current.on("chat:message", (msg: any) => {
      setMessages((prev) => [...prev, msg]);
    });
    socketRef.current.on("chat:delivered", (evt: any) => {
      setMessages((prev) => prev.map(m => (String(m._id || m.id) === String(evt.id) ? { ...m, delivered_at: evt.delivered_at } : m)));
    });
    socketRef.current.on("chat:read", (evt: any) => {
      setMessages((prev) => prev.map(m => (String(m._id || m.id) === String(evt.id) ? { ...m, read: true, read_at: evt.read_at } : m)));
    });
    socketRef.current.on("chat:typing", (state: any) => {
      setTyping(!!state?.typing);
    });
    socketRef.current.on("chat:reaction", (evt: any) => {
      setMessages((prev) => prev.map(m => {
        if (String(m._id || m.id) !== String(evt.messageId)) return m;
        const reactions = Array.isArray(m.reactions) ? [...m.reactions, evt.reaction] : [evt.reaction];
        return { ...m, reactions };
      }));
    });
    // Optionally fetch chat history from backend (only for valid ObjectId-like ids)
    const rid = recipient?.id || recipient?._id;
    if (rid && /^[a-fA-F0-9]{24}$/.test(String(rid))) {
      fetch(`/api/communication/history?recipientId=${rid}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
        .then((res) => res.ok ? res.json() : { messages: [] })
        .then((data) => setMessages(data.messages || []))
        .catch(() => setMessages([]));
    } else {
      setMessages([]);
    }
    return () => {
      socketRef.current.disconnect();
    };
  }, [user, recipient]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-ack delivered and read for incoming messages in this active thread
  useEffect(() => {
    const uid = String(user?.id);
    const rid = String(recipient?.id || recipient?._id || '');
    const token = localStorage.getItem('token');
    messages.forEach((m: any) => {
      const mid = String(m._id || m.id || '');
      const mine = m.senderId ? String(m.senderId) === uid : m.from === (user?.full_name || user?.email);
      if (!mine && rid && (String(m.senderId) === rid || String(m.fromId) === rid)) {
        if (!m.delivered_at && !deliveredAcksRef.current.has(mid)) {
          deliveredAcksRef.current.add(mid);
          fetch(`/api/communication/messages/${mid}/delivered`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }
        if (!m.read_at && !m.read && !readAcksRef.current.has(mid)) {
          readAcksRef.current.add(mid);
          fetch(`/api/communication/messages/${mid}/read`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => {});
        }
      }
    });
  }, [messages, user, recipient]);

  const validRecipient = () => {
    const rid = recipient?.id || recipient?._id;
    return !!rid && /^[a-fA-F0-9]{24}$/.test(String(rid));
  };

  const sendMessage = (e) => {
    e.preventDefault();
    setError("");
    if (!input.trim() && !file) return;
    const rid = recipient?.id || recipient?._id;
    if (!validRecipient()) {
      setError("Select a valid recipient to send messages.");
      return;
    }
    if (file) {
      const form = new FormData();
      form.append('recipientId', String(rid));
      if (input.trim()) form.append('text', input.trim());
      form.append('file', file);
      fetch(`/api/communication/messages/with-attachment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: form,
      })
        .then(async res => {
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j.error || 'Upload failed');
          }
          return res.json();
        })
        .then(saved => {
          setMessages(prev => [...prev, saved]);
          socketRef.current?.emit('chat:send', { recipientId: rid, text: saved.text || '', from: user?.full_name || user?.email });
        })
        .catch((e) => setError(e.message || String(e)))
        .finally(() => { setInput(''); setFile(null); });
    } else {
      const payload = { recipientId: rid, message: input };
      fetch(`/api/communication/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      })
        .then(async (res) => {
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            throw new Error(j.error || 'Failed to send message');
          }
          return res.json();
        })
        .then((saved) => {
          setMessages((prev) => [...prev, saved]);
          socketRef.current?.emit("chat:send", {
            recipientId: payload.recipientId,
            text: input,
            from: user?.full_name || user?.email,
          });
        })
        .catch((e) => setError(e.message || String(e)))
        .finally(() => setInput(""));
    }
  };

  const react = async (messageId: string, type: string) => {
    try {
      await fetch(`/api/communication/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ type }),
      });
    } catch {}
  };

  // Typing indicator
  useEffect(() => {
    const t = setTimeout(() => {
      socketRef.current?.emit('chat:typing', { to: recipient?.id || recipient?._id, typing: !!input });
    }, 120);
    return () => clearTimeout(t);
  }, [input, recipient]);

  const renderStatus = (m: any, mine: boolean) => {
    if (!mine) return null;
    if (m.read_at || m.read) return <span className="text-[10px] text-blue-500 ml-2">✓✓</span>;
    if (m.delivered_at) return <span className="text-[10px] text-gray-500 ml-2">✓✓</span>;
    return <span className="text-[10px] text-gray-400 ml-2">✓</span>;
  };

  const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  const dayLabel = (d: Date) => d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  const initialOf = (name?: string) => (name?.trim()?.[0]?.toUpperCase() || '?');
  const groupReactions = (reactions: any[] = []) => {
    const map = new Map<string, number>();
    reactions.forEach(r => map.set(r.type, (map.get(r.type) || 0) + 1));
    return Array.from(map.entries()).map(([type, count]) => ({ type, count }));
  };

  return (
    <div className="flex flex-col h-96 border rounded bg-white">
      <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
        <div className="font-medium text-sm">{recipient?.full_name || recipient?.email}</div>
        <div className="text-xs text-muted-foreground">{typing ? 'typing…' : ''}</div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gradient-to-b from-background to-muted/20">
        {messages.map((m, i) => {
          const mine = m.senderId ? String(m.senderId) === String(user?.id) : m.from === (user?.full_name || user?.email);
          const when = m.date || m.created_at || m.createdAt || new Date().toISOString();
          const thisDate = new Date(when);
          const prev = i > 0 ? messages[i-1] : null;
          const prevWhen = prev ? (prev.date || prev.created_at || prev.createdAt || new Date().toISOString()) : null;
          const showDay = !prevWhen || !isSameDay(thisDate, new Date(prevWhen));
          const youInitial = initialOf(user?.full_name || user?.email);
          const otherInitial = initialOf(recipient?.full_name || recipient?.email);
          const reactionCounts = groupReactions(m.reactions);
          return (
            <div key={i} className="space-y-2">
              {showDay && (
                <div className="flex justify-center my-2">
                  <span className="text-[11px] px-2 py-1 rounded-full bg-muted text-muted-foreground">
                    {dayLabel(thisDate)}
                  </span>
                </div>
              )}
              <div className={`flex items-end gap-2 ${mine ? 'justify-end' : 'justify-start'} group`}>
                {!mine && (
                  <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[11px] select-none">
                    {otherInitial}
                  </div>
                )}
                <div className={`relative max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${mine ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'}`}>
                  {m.text && (
                    <div className="text-sm whitespace-pre-wrap break-words">{m.text}</div>
                  )}
                  {m.attachment && (
                    <div className="mt-1">
                      {m.attachment.mimetype?.startsWith('image/') ? (
                        <a href={`/${m.attachment.filepath}`} target="_blank" rel="noreferrer">
                          <img
                            src={`/${m.attachment.filepath}`}
                            alt={m.attachment.filename || 'Attachment'}
                            className="rounded-md max-h-48 object-contain border border-black/5"
                          />
                        </a>
                      ) : m.attachment.mimetype?.startsWith('audio/') ? (
                        <audio controls className="max-w-full">
                          <source src={`/${m.attachment.filepath}`} type={m.attachment.mimetype} />
                          Your browser does not support the audio element.
                        </audio>
                      ) : m.attachment.mimetype?.startsWith('video/') ? (
                        <video controls className="max-w-full max-h-60 rounded-md border border-black/5">
                          <source src={`/${m.attachment.filepath}`} type={m.attachment.mimetype} />
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <a className="inline-flex items-center gap-2 text-xs underline" href={`/${m.attachment.filepath}`} target="_blank" rel="noreferrer">
                          <FileIcon className="w-3 h-3" /> {m.attachment.filename || 'Attachment'}
                        </a>
                      )}
                    </div>
                  )}
                  {reactionCounts.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1 text-[11px]">
                      {reactionCounts.map((r) => (
                        <span key={r.type} className={`px-1.5 py-0.5 rounded-full border ${mine ? 'border-white/40' : 'border-black/10'} bg-white/60 backdrop-blur text-xs`}>{r.type} {r.count > 1 ? r.count : ''}</span>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-end mt-1 text-[10px] opacity-70">
                    <span>{new Date(when).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {renderStatus(m, mine)}
                  </div>
                  {/* Hover actions */}
                  <div className={`absolute -bottom-6 ${mine ? 'right-2' : 'left-2'} hidden group-hover:flex gap-1`}>
                    <button type="button" className="p-1 rounded-full bg-black/5 hover:bg-black/10" title="Add reaction">
                      <SmilePlus className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex gap-1">
                      {['👍','❤️','😂','😮','😢','🙏'].map(em => (
                        <button type="button" key={em} className="text-[12px] opacity-80 hover:opacity-100" onClick={() => react(String(m._id || m.id), em)}>
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                {mine && (
                  <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[11px] select-none">
                    {youInitial}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="p-2 border-t bg-white">
        <div className="flex items-center gap-2">
          <label className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${validRecipient() ? 'bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80' : 'bg-muted/40 text-muted-foreground/60 cursor-not-allowed'}`} title={validRecipient() ? 'Attach file' : 'Select a recipient first'}>
            <Paperclip className="w-4 h-4" />
            <input
              type="file"
              accept="image/*,audio/*,video/*,application/pdf,.doc,.docx,.mkv,.aac,.mp4,.mov"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={!validRecipient()}
            />
          </label>
          <div className="flex-1 flex items-center rounded-full px-3 bg-gray-100">
            <input
              className="flex-1 px-1 py-2 outline-none bg-transparent"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Write a message"
            />
          </div>
          <button type="submit" className="inline-flex items-center gap-2 px-4 h-10 rounded-full bg-primary text-white disabled:opacity-60" disabled={(!input.trim() && !file) || !validRecipient()} title={validRecipient() ? 'Send' : 'Select a recipient first'}>
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>
        {file && (
          <div className="pl-12 pt-1 text-xs text-muted-foreground flex items-center gap-1">
            {file.type?.startsWith('image/') ? <ImageIcon className="w-3 h-3" /> : <FileIcon className="w-3 h-3" />} {file.name}
          </div>
        )}
        {error && (
          <div className="pl-12 pt-1 text-xs text-red-600">{error}</div>
        )}
      </form>
    </div>
  );
};

export default Chat;
