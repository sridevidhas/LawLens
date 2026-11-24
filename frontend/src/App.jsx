
import { useEffect, useRef, useState } from 'react';
import {
  Scale,
  Plus,
  MessageSquare,
  PanelLeftClose,
  PanelLeft,
  Send,
  BookOpen,
  LogOut,
  ShieldCheck,
  ArrowUpRight,
  LoaderCircle,
  Menu,
  Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import {
  login,
  register,
  listConversations,
  getMessages,
  sendChat,
  getToken,
} from './api';

const starter = [
  'Explain a legal section in simple language',
  'Summarise the key points in my legal PDFs',
  'What exceptions are mentioned in the source documents?',
];

// Convert escaped Markdown bold markers to standard Markdown.
// Example: \*\*Heading\*\* becomes **Heading**
function normalizeMarkdown(content) {
  return (content || '').replace(/\\\*\\\*/g, '**');
}

function Auth({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    try {
      if (mode === 'register') {
        await register(username, password);
      }

      await login(username, password);
      onAuth();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="brand-mark">
          <Scale size={25} />
        </div>

        <p className="eyebrow">LEGAL RESEARCH, GROUNDED</p>
        <h1>Welcome to LawLens</h1>
        <p className="muted">
          Ask questions. Trace answers back to the source.
        </p>

        <form onSubmit={submit}>
          <label>
            Username
            <input
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              autoComplete={
                mode === 'login' ? 'current-password' : 'new-password'
              }
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button className="primary full" disabled={busy}>
            {busy
              ? 'Please wait…'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <p className="switch-auth">
          {mode === 'login'
            ? 'New to LawLens?'
            : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError('');
            }}
          >
            {mode === 'login' ? 'Create account' : 'Sign in'}
          </button>
        </p>

        <p className="tiny muted">
          Legal information only — not a substitute for a qualified lawyer.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sidebar, setSidebar] = useState(true);

  const endRef = useRef(null);

  useEffect(() => {
    if (authed) {
      refresh();
    }
  }, [authed]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function refresh() {
    try {
      const items = await listConversations();
      setConversations(items);

      if (!active && items.length) {
        await openConversation(items[0].id);
      }
    } catch (e) {
      if (e.message.includes('401')) {
        logout();
      } else {
        setError(e.message);
      }
    }
  }

  async function openConversation(id) {
    setActive(id);
    setError('');

    try {
      const items = await getMessages(id);
      setMessages(items);
    } catch (e) {
      setError(e.message);
    }
  }

  function logout() {
    localStorage.removeItem('lawlens_access');
    localStorage.removeItem('lawlens_refresh');

    setAuthed(false);
    setConversations([]);
    setActive(null);
    setMessages([]);
    setDraft('');
    setError('');
  }

  function newChat() {
    setActive(null);
    setMessages([]);
    setDraft('');
    setError('');
  }

  async function send(text = draft) {
    const content = text.trim();

    if (!content || busy) {
      return;
    }

    setDraft('');
    setError('');

    setMessages((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        role: 'user',
        content,
      },
    ]);

    setBusy(true);

    try {
      const result = await sendChat(content, active);

      setActive(result.conversation_id);

      setMessages((prev) => [
        ...prev.filter(
          (m) =>
            !String(m.id).startsWith('temp-') ||
            m.content !== content
        ),
        result.user_message,
        result.assistant_message,
      ]);

      const items = await listConversations();
      setConversations(items);
    } catch (e) {
      setError(e.message);

      setMessages((prev) =>
        prev.filter(
          (m) =>
            !String(m.id).startsWith('temp-') ||
            m.content !== content
        )
      );
    } finally {
      setBusy(false);
    }
  }

  if (!authed) {
    return <Auth onAuth={() => setAuthed(true)} />;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebar ? '' : 'collapsed'}`}>
        <div className="side-top">
          <div className="brand">
            <div className="brand-mark small">
              <Scale size={19} />
            </div>

            {sidebar && (
              <div>
                <b>LawLens</b>
                <span>Legal research assistant</span>
              </div>
            )}
          </div>

          <button
            className="icon-btn side-toggle"
            title="Toggle sidebar"
            onClick={() => setSidebar(!sidebar)}
          >
            {sidebar ? (
              <PanelLeftClose size={18} />
            ) : (
              <PanelLeft size={18} />
            )}
          </button>
        </div>

        <button className="new-chat" onClick={newChat}>
          <Plus size={17} />
          {sidebar && 'New conversation'}
        </button>

        {sidebar && (
          <>
            <p className="section-label">YOUR HISTORY</p>

            <div className="history-list">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  className={`history-item ${
                    active === c.id ? 'selected' : ''
                  }`}
                  onClick={() => openConversation(c.id)}
                >
                  <MessageSquare size={16} />
                  <span>{c.title}</span>
                </button>
              ))}

              {!conversations.length && (
                <p className="empty-history">
                  Your conversations will appear here.
                </p>
              )}
            </div>

            <div className="sidebar-bottom">
              <div className="privacy-note">
                <ShieldCheck size={17} />
                <span>
                  <b>Your space, your sources</b>
                  <small>
                    Conversations are private to your account.
                  </small>
                </span>
              </div>

              <button className="logout" onClick={logout}>
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </>
        )}
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="top-left">
            <button
              className="icon-btn mobile-menu"
              onClick={() => setSidebar(!sidebar)}
            >
              <Menu size={19} />
            </button>

            <span className="online-dot" />
            <span>Legal research workspace</span>
          </div>

          <div className="top-right">
            <span className="source-pill">
              <BookOpen size={14} />
              Source-grounded answers
            </span>
          </div>
        </header>

        <section className="chat-area">
          {messages.length === 0 ? (
            <div className="welcome">
              <div className="welcome-icon">
                <Sparkles size={23} />
              </div>

              <p className="eyebrow">
                YOUR LEGAL RESEARCH COMPANION
              </p>

              <h1>
                Clarity starts with
                <br />
                <span>the right question.</span>
              </h1>

              <p className="welcome-copy">
                Ask about the legal documents you've indexed. LawLens
                retrieves relevant passages and shows where its answers
                come from.
              </p>

              <div className="starter-grid">
                {starter.map((s, i) => (
                  <button key={s} onClick={() => send(s)}>
                    <span>{['01', '02', '03'][i]}</span>
                    {s}
                    <ArrowUpRight size={16} />
                  </button>
                ))}
              </div>

              <p className="tiny muted welcome-tip">
                Start by adding legal PDFs to{' '}
                <code>backend/legal_docs</code> and running the ingestion
                command.
              </p>
            </div>
          ) : (
            <div className="message-list">
              {messages.map((m) => (
                <article
                  key={m.id}
                  className={`message ${m.role}`}
                >
                  <div className="avatar">
                    {m.role === 'assistant' ? (
                      <Scale size={16} />
                    ) : (
                      <span>Y</span>
                    )}
                  </div>

                  <div className="message-body">
                    <div className="message-label">
                      {m.role === 'assistant' ? 'LAWLENS' : 'YOU'}
                    </div>

                    <div className="message-content">
                      <ReactMarkdown>
                        {normalizeMarkdown(m.content)}
                      </ReactMarkdown>
                    </div>

                    {m.role === 'assistant' &&
                      m.sources?.length > 0 && (
                        <div className="sources">
                          <div className="sources-heading">
                            <BookOpen size={15} />
                            Sources used
                            <span>{m.sources.length}</span>
                          </div>

                          {m.sources.map((s, i) => (
                            <details
                              key={s.id || i}
                              className="source-card"
                            >
                              <summary>
                                <span className="source-number">
                                  {String(s.id || i + 1).padStart(2, '0')}
                                </span>

                                <span className="source-name">
                                  {s.source}
                                  <small>Page {s.page ?? '—'}</small>
                                </span>

                                <ArrowUpRight size={15} />
                              </summary>

                              <p>{s.excerpt}</p>
                            </details>
                          ))}
                        </div>
                      )}
                  </div>
                </article>
              ))}

              {busy && (
                <article className="message assistant">
                  <div className="avatar">
                    <Scale size={16} />
                  </div>

                  <div className="message-body">
                    <div className="message-label">LAWLENS</div>
                    <div className="thinking">
                      <LoaderCircle size={16} />
                      Looking through your legal sources…
                    </div>
                  </div>
                </article>
              )}

              <div ref={endRef} />
            </div>
          )}

          {error && <div className="error-banner">{error}</div>}
        </section>

        <footer className="composer-wrap">
          <form
            className="composer"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask a question about your legal documents…"
              rows={1}
            />

            <button
              className="send-btn"
              disabled={!draft.trim() || busy}
              aria-label="Send message"
            >
              <Send size={17} />
            </button>
          </form>

          <p className="disclaimer">
            LawLens can make mistakes. Check cited source passages and
            consult a qualified legal professional for advice.
          </p>
        </footer>
      </main>
    </div>
  );
}
