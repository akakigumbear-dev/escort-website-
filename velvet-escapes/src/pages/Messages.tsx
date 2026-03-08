import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { io, type Socket } from "socket.io-client";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import {
  getConversations,
  getMessagesWith,
  sendMessage,
  type Conversation,
  type MessageDto,
} from "@/lib/messages-api";
import { API_BASE_URL } from "@/lib/api";
import { MessageCircle, Send, Paperclip, Loader2 } from "lucide-react";

function DMImage({ src, headers }: { src: string; headers: Record<string, string> }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!src) return;
    let revoked = false;
    fetch(src, { headers })
      .then((r) => r.blob())
      .then((blob) => {
        if (!revoked) setBlobUrl(URL.createObjectURL(blob));
      })
      .catch(() => { if (!revoked) setBlobUrl(null); });
    return () => {
      revoked = true;
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [src]);
  if (!blobUrl) return <span className="text-xs text-muted-foreground">[image]</span>;
  return (
    <img
      src={blobUrl}
      alt=""
      className="max-w-full rounded max-h-48 object-contain"
      style={{ maxWidth: "200px" }}
    />
  );
}

export default function Messages() {
  const [searchParams] = useSearchParams();
  const withUserId = searchParams.get("with");
  const { isAuthenticated } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(withUserId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !token) return;
    const socket = io(API_BASE_URL + "/messages", {
      auth: { token },
      path: "/socket.io",
    });
    socketRef.current = socket;
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, token]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const onMessage = (payload: MessageDto) => {
      setMessages((prev) => {
        if (selectedUserId && (payload.senderId === selectedUserId || payload.receiverId === selectedUserId)) {
          if (prev.some((m) => m.id === payload.id)) return prev;
          return [...prev, { ...payload, createdAt: typeof payload.createdAt === "string" ? payload.createdAt : new Date(payload.createdAt).toISOString() }];
        }
        return prev;
      });
    };
    socket.on("message", onMessage);
    return () => {
      socket.off("message", onMessage);
    };
  }, [selectedUserId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    getConversations()
      .then(setConversations)
      .catch(() => setConversations([]))
      .finally(() => setLoadingConvos(false));
  }, [isAuthenticated]);

  useEffect(() => {
    if (withUserId) setSelectedUserId(withUserId);
  }, [withUserId]);

  useEffect(() => {
    if (!selectedUserId) {
      setMessages([]);
      return;
    }
    setLoadingMessages(true);
    getMessagesWith(selectedUserId, 80)
      .then((r) => setMessages(r.messages))
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false));
  }, [selectedUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!selectedUserId || (!input.trim() && !attachment)) return;
    setSending(true);
    try {
      const sent = await sendMessage(selectedUserId, input.trim() || undefined, attachment ?? undefined);
      setMessages((prev) => [...prev, sent]);
      setInput("");
      setAttachment(null);
    } finally {
      setSending(false);
    }
  };

  const attachmentUrlWithAuth = (path: string) => {
    if (!path) return "";
    const encoded = path.replace(/^\/uploads\/dm\//, "").split("/").map(encodeURIComponent).join("/");
    return `${API_BASE_URL}/messages/attachment/${encoded}`;
  };

  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-12 text-center text-muted-foreground">
          Log in to view messages.
        </div>
      </div>
    );
  }

  const selectedConvo = selectedUserId
    ? conversations.find((c) => c.userId === selectedUserId)
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="container flex-1 flex flex-col md:flex-row gap-0 border border-border/50 rounded-xl overflow-hidden bg-card mt-4 mb-8 max-w-5xl mx-auto min-h-[500px]">
        <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-border/50 flex flex-col">
          <div className="p-3 border-b border-border/50">
            <h1 className="font-display text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" /> Messages
            </h1>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingConvos ? (
              <div className="p-4 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : conversations.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No conversations yet. Subscribe to an escort and use &quot;Message&quot; on their profile.</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.userId}
                  type="button"
                  onClick={() => setSelectedUserId(c.userId)}
                  className={`w-full text-left px-4 py-3 border-b border-border/30 hover:bg-muted/50 transition-colors ${selectedUserId === c.userId ? "bg-primary/10 border-l-2 border-l-primary" : ""}`}
                >
                  <p className="font-medium text-sm truncate">{c.email}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {c.lastMessage.hasAttachment ? "Attachment" : c.lastMessage.content || "—"}
                  </p>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          {selectedUserId ? (
            <>
              <div className="p-3 border-b border-border/50 flex items-center gap-2">
                <span className="font-medium text-sm truncate">
                  {selectedConvo?.email ?? selectedUserId.slice(0, 8)}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loadingMessages ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex ${m.senderId === selectedUserId ? "justify-start" : "justify-end"}`}
                    >
                      <div className={`max-w-[85%] rounded-lg px-3 py-2 ${m.senderId === selectedUserId ? "bg-muted text-foreground" : "gold-gradient text-primary-foreground"}`}>
                        {m.content && <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>}
                        {m.attachmentPath && (
                          <div className="mt-2">
                            {m.attachmentPath.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                              <DMImage src={attachmentUrlWithAuth(m.attachmentPath)} headers={authHeaders()} />
                            ) : (
                              <a
                                href={attachmentUrlWithAuth(m.attachmentPath)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs underline flex items-center gap-1"
                              >
                                <Paperclip className="h-3 w-3" /> {m.attachmentOriginalName || "File"}
                              </a>
                            )}
                          </div>
                        )}
                        <p className="text-[10px] opacity-80 mt-1">
                          {new Date(m.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-3 border-t border-border/50 flex gap-2">
                <label className="cursor-pointer p-2 rounded-lg border border-border/50 hover:bg-muted/50">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*,application/pdf"
                    onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                  />
                </label>
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  className="flex-1 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={sending || (!input.trim() && !attachment)}
                  className="gold-gradient rounded-lg p-2 text-primary-foreground disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </div>
              {attachment && (
                <div className="px-3 pb-2 text-xs text-muted-foreground">
                  Attachment: {attachment.name} — send message to include it
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation or start from an escort profile (Message button).
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
