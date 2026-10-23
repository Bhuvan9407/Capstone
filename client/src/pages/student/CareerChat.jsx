import { useCallback, useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Loader2, Bot, User as UserIcon, BookOpen, History } from 'lucide-react';
import { chatApi } from '../../services/index.js';
import { apiError } from '../../services/api.js';
import { Card, Button, EmptyState, Spinner, NoticeBanner } from '../../components/index.js';

export const CareerChat = () => {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [meta, setMeta] = useState({ grounded: null, retrieval: null });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const bottomRef = useRef(null);

  const loadConversations = useCallback(async () => {
    try {
      const { data } = await chatApi.conversations();
      setConversations(data.items || []);
    } catch {
      /* non-fatal; sidebar hides */
    }
  }, []);

  const openConversation = useCallback(async (id) => {
    setActiveId(id);
    setHistoryOpen(false);
    setError('');
    try {
      const { data } = await chatApi.conversation(id);
      setMessages(data.messages || []);
      setMeta({ grounded: null, retrieval: null });
    } catch (err) {
      setError(apiError(err).message);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  const ask = async (e) => {
    e.preventDefault();
    const q = question.trim();
    if (q.length < 3) return;
    setQuestion('');
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setBusy(true);
    setError('');
    try {
      const { data } = await chatApi.ask({ question: q, conversationId: activeId || undefined });
      setActiveId(data.conversationId);
      setMessages(data.messages || []);
      setMeta({ grounded: data.grounded, retrieval: data.retrieval, model: data.model });
      loadConversations();
    } catch (err) {
      const er = apiError(err);
      setError(er.status === 503
        ? 'The model is offline right now. Start Ollama and retry — the assistant never answers without its grounding sources.'
        : er.message);
      setMessages((m) => m.filter((x) => x.content !== q));
    } finally {
      setBusy(false);
    }
  };

  const newChat = () => {
    setActiveId(null);
    setMessages([]);
    setMeta({ grounded: null, retrieval: null });
    setError('');
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-9rem)] max-w-4xl flex-col">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-navy">
            <MessageSquare className="h-6 w-6 text-blue-600" /> Career Chat
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">Answers are grounded in your own documents, with citations shown.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setHistoryOpen((o) => !o)}>
            <History className="h-3.5 w-3.5" /> History ({conversations.length})
          </Button>
          <Button size="sm" variant="ghost" onClick={newChat}>New chat</Button>
        </div>
      </div>

      {historyOpen && conversations.length > 0 && (
        <Card className="mb-3 max-h-40 overflow-y-auto p-2">
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => openConversation(c.id)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-xs font-semibold ${c.id === activeId ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {c.title}
              <span className="ml-2 text-[10px] font-normal text-slate-400">{new Date(c.updatedAt).toLocaleString()}</span>
            </button>
          ))}
        </Card>
      )}

      <Card className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && !busy && (
            <EmptyState
              icon={<BookOpen className="h-10 w-10" />}
              title="Ask about your preparation"
              message="e.g. 'What should I practice for backend internships based on my projects?'. If your library is empty, the assistant will say so instead of inventing advice."
            />
          )}
          {messages.map((m, i) => (
            <div key={m.id || i} className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Bot className="h-4 w-4" />
                </span>
              )}
              <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-800'}`}>
                <p className="whitespace-pre-line">{m.content}</p>
                {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                  <div className="mt-2 border-t border-slate-200 pt-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Sources</p>
                    <ul className="mt-1 space-y-0.5">
                      {m.sources.map((s, j) => (
                        <li key={j} className="text-[10px] text-slate-500">
                          [{j + 1}] {s.title} <span className="font-semibold uppercase">({s.sourceType}{s.kind ? ` · ${s.kind}` : ''})</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy text-white">
                  <UserIcon className="h-4 w-4" />
                </span>
              )}
            </div>
          ))}
          {busy && (
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Consulting your documents…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {meta.retrieval?.mode === 'keyword' && (
          <div className="px-5 pb-2">
            <NoticeBanner>{meta.retrieval.notice || 'Embeddings unavailable — used keyword retrieval for this answer.'}</NoticeBanner>
          </div>
        )}
        {error && (
          <div className="px-5 pb-2">
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>
          </div>
        )}

        <form onSubmit={ask} className="flex gap-2 border-t border-slate-100 p-4">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask something grounded in your evidence…"
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            maxLength={4000}
          />
          <Button type="submit" loading={busy} disabled={question.trim().length < 3}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default CareerChat;
