import React, { useState, useEffect } from 'react';
import { echo } from './echo'; // Importación de la instancia global configurada para Laravel Reverb

interface User { id: number; name: string; email: string; }
interface Message { id: number; thread_id: number; user_id: number; body: string; created_at: string; user?: User; }
interface Thread { id: number; subject: string; created_at: string; messages?: Message[]; latest_message?: Message; }

const API_URL = 'http://127.0.0.1:8000/api';

const Logo = ({ compact }: { compact?: boolean }) => (
  <div className={`flex items-center gap-3 ${compact ? 'text-sm' : ''}`}>
    <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-[0_16px_40px_-24px_rgba(14,165,233,0.8)]">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6">
        <path fill="currentColor" d="M4 7.25C4 5.455 5.455 4 7.25 4h9.5C18.545 4 20 5.455 20 7.25v9.5c0 1.795-1.455 3.25-3.25 3.25H7.25C5.455 20 4 18.545 4 16.75V7.25Zm2.5-.25 5.5 3.75 5.5-3.75H6.5Zm11.5 1.88-5.64 3.85a.75.75 0 0 1-.72 0L6.5 8.63V16.75c0 .414.336.75.75.75h9.5a.75.75 0 0 0 .75-.75V8.63Z" />
      </svg>
    </div>
    <div className="leading-tight">
      <p className="text-[11px] uppercase tracking-[0.26em] text-sky-500">Facturify</p>
      <span className="block text-lg font-semibold text-slate-900">MiInbox</span>
    </div>
  </div>
);

export default function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Perfil del usuario autenticado
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');


  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [search, setSearch] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [loading, setLoading] = useState(false);


  const [isNewThreadModalOpen, setIsNewThreadModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState('');
  const [newThreadBody, setNewThreadBody] = useState('');


  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (savedToken && !token) {
      setToken(savedToken);
    }
  }, []);

  const getHeaders = (customToken?: string) => ({
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Authorization': `Bearer ${customToken || token}`
  });


  const fetchUserProfile = async (authToken: string) => {
    try {
      const res = await fetch(`${API_URL}/user`, { headers: getHeaders(authToken) });
      if (res.ok) {
        const userData = await res.json();
        setCurrentUser(userData);
        return userData;
      } else {
        throw new Error('No se pudo validar el perfil en el servidor');
      }
    } catch (err) {
      console.error('Error al obtener perfil:', err);
      handleLogout();
    }
  };


  useEffect(() => {
    if (token && !currentUser) {
      fetchUserProfile(token);
    }
  }, [token]);


  useEffect(() => {
    if (!token || !activeThread || !activeThread.id) return;

    let channel: any;

    try {
      channel = echo.channel(`thread.${activeThread.id}`)
        .listen('.message.created', (data: { message: Message }) => {

          setActiveThread(prev => {
            if (!prev) return null;
            if (Number(data.message.thread_id) !== Number(prev.id)) return prev;

            const messageExists = prev.messages?.some(m => m.id === data.message.id);
            if (messageExists) return prev;

            return {
              ...prev,
              messages: [...(prev.messages || []), data.message]
            };
          });

          fetchThreads();
        });
    } catch (error) {
      console.warn('El servidor Reverb WebSockets está fuera de línea.', error);
    }

    return () => {
      if (channel) {
        echo.leaveChannel(`thread.${activeThread.id}`);
      }
    };
  }, [activeThread?.id, token]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!res.ok) throw new Error('Credenciales inválidas u error en el servidor');

      const data = await res.json();


      localStorage.setItem('token', data.access_token);


      await fetchUserProfile(data.access_token);


      setToken(data.access_token);
    } catch (err: any) {
      setAuthError(err.message || 'Error al iniciar sesión');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    setActiveThread(null);
    setThreads([]);
  };


  const fetchThreads = async () => {
    if (!token) return;
    try {
      const url = search ? `${API_URL}/threads?search=${encodeURIComponent(search)}` : `${API_URL}/threads`;
      const res = await fetch(url, { headers: getHeaders() });

      if (res.ok) {
        const data = await res.json();
        setThreads((data.data as Thread[]) || (data as Thread[]));
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error('Error de red al conectar con la API (Posible servidor caído):', err);
      setAuthError('Se perdió la conexión con el servidor de soporte. Por favor verifica tu servicio.');
      handleLogout();
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [search, token]);


  const handleSelectThread = async (id: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/threads/${id}`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setActiveThread(data);
      }
    } catch (err) {
      console.error('Error al cargar detalle del hilo:', err);
    } finally {
      setLoading(false);
    }
  };


  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim() || !activeThread) return;

    try {
      const res = await fetch(`${API_URL}/threads/${activeThread.id}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ body: replyBody })
      });

      if (res.ok) {
        const newMsg = await res.json();
        setActiveThread({
          ...activeThread,
          messages: [...(activeThread.messages || []), newMsg]
        });
        setReplyBody('');
        fetchThreads();
      }
    } catch (err) {
      console.error('Error al enviar respuesta:', err);
    }
  };


  const handleCreateThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newThreadBody.trim()) return;

    try {
      const res = await fetch(`${API_URL}/threads`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ subject: newSubject, body: newThreadBody })
      });

      if (res.ok) {
        const data = await res.json();
        setNewSubject('');
        setNewThreadBody('');
        setIsNewThreadModalOpen(false);
        fetchThreads();
        if (data.id) {
          handleSelectThread(data.id);
        }
      }
    } catch (err) {
      console.error('Error al crear el hilo:', err);
    }
  };


  if (!token || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7f9fc] text-slate-900 font-sans p-4 antialiased">
        <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-[28px] p-8 shadow-[0_20px_50px_-35px_rgba(15,23,42,0.35)] relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-blue-600"></div>

          <div className="flex flex-col items-center gap-4 mb-8">
            <Logo />
            <p className="text-sm text-slate-500 text-center max-w-sm">Ingresa a tu panel de soporte técnico y accede a tus conversaciones de soporte desde Facturify.</p>
          </div>

          {authError && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-xl mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Correo Electrónico</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="admin@facturify.com" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Contraseña</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-3 rounded-xl font-semibold transition-all shadow-md active:scale-[0.98]">
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen flex-col bg-[#f8fafc] text-slate-900 font-sans antialiased">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 shadow-xs z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5">
              <path fill="currentColor" d="M4 7.25C4 5.455 5.455 4 7.25 4h9.5C18.545 4 20 5.455 20 7.25v9.5c0 1.795-1.455 3.25-3.25 3.25H7.25C5.455 20 4 18.545 4 16.75V7.25Zm2.5-.25 5.5 3.75 5.5-3.75H6.5Zm11.5 1.88-5.64 3.85a.75.75 0 0 1-.72 0L6.5 8.63V16.75c0 .414.336.75.75.75h9.5a.75.75 0 0 0 .75-.75V8.63Z" />
            </svg>
          </div>
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-[0.22em] text-sky-500">Facturify</p>
            <span className="text-lg font-semibold text-slate-900">MiInbox</span>
          </div>
        </div>


        <div className="w-full max-w-md relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.604 10.604Z" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar por asunto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>


        <div className="flex items-center gap-4">
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition-colors py-2 px-3 rounded-lg hover:bg-slate-100">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
            </svg>
            Salir
          </button>
          <button
            onClick={() => setIsNewThreadModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-sm active:scale-[0.97]"
          >
            <svg xmlns="http://www.w3.org/2000/xl" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuevo Mensaje
          </button>
        </div>
      </header>


      <div className="flex flex-1 overflow-hidden">
        <aside className="w-1/4 border-r border-slate-200 bg-white overflow-y-auto p-4">
          <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 px-2">Conversaciones</div>
          <ul className="space-y-1">
            {threads.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-50 border border-slate-100 rounded-xl">
                No hay hilos disponibles.
              </div>
            ) : (
              threads.map(t => (
                <li
                  key={t.id}
                  onClick={() => handleSelectThread(t.id)}
                  className={`p-3 cursor-pointer rounded-xl transition-all group border ${activeThread?.id === t.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-slate-50 border-transparent'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`font-semibold text-sm truncate transition-colors ${activeThread?.id === t.id ? 'text-blue-600' : 'text-slate-700 group-hover:text-slate-950'}`}>
                      {t.subject}
                    </span>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">#{t.id}</span>
                  </div>
                  {t.latest_message && (
                    <p className="text-xs text-slate-500 truncate line-clamp-1 group-hover:text-slate-600 mt-1">
                      <span className="font-semibold text-slate-700">
                        {t.latest_message.user_id === currentUser.id ? 'Tú' : (t.latest_message.user?.name || 'Usuario')}:
                      </span>{' '}
                      {t.latest_message.body}
                    </p>
                  )}
                </li>
              ))
            )}
          </ul>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden bg-[#f8fafc]">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 text-sm gap-3">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Cargando mensajes...</span>
            </div>
          ) : activeThread ? (
            <>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="border border-slate-200 p-5 rounded-2xl bg-white shadow-sm relative">
                  <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                    <div>
                      <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Asunto</span>
                      <h2 className="text-lg font-bold text-slate-900 mt-0.5">{activeThread.subject}</h2>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Creado</span>
                      <p className="text-xs text-slate-600 mt-0.5">{new Date(activeThread.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>


                  <div className="space-y-4">
                    {activeThread.messages?.map(m => (
                      <div key={m.id} className="flex flex-col p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                            {currentUser && m.user_id === currentUser.id ? (
                              <>
                                {currentUser.name}
                                <span className="text-xs font-normal text-slate-400 font-sans ml-1">(Tú)</span>
                              </>
                            ) : (
                              m.user?.name || 'Usuario'
                            )}
                          </span>
                          <span className="text-[10px] text-slate-400">{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>


              <form onSubmit={handleSendReply} className="p-4 border-t border-slate-200 bg-white shadow-lg">
                <div className="relative rounded-xl bg-slate-50 border border-slate-200 focus-within:border-blue-500 transition-all p-2">
                  <textarea
                    rows={2}
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Escribe tu respuesta aquí..."
                    className="w-full bg-transparent border-0 rounded-lg p-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none resize-none min-h-[60px]"
                  />
                  <div className="flex justify-end border-t border-slate-100 pt-2 px-1">
                    <button type="submit" className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg transition-all shadow-xs active:scale-95">
                      Responder
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                      </svg>
                    </button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-sm gap-2 italic">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-300">
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.33-.017.64.097.864.304.245.227.359.558.29.888a10.045 10.045 0 0 1-1.63 3.654A11.049 11.049 0 0 1 12 18c-1.92 0-3.73-.49-5.31-1.343a10.042 10.042 0 0 1-1.63-3.654c-.069-.33.045-.661.29-.888.223-.207.533-.321.864-.304h14.036Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v11.25" />
              </svg>
              <span>Selecciona una conversación para leer el hilo de mensajes.</span>
            </div>
          )}
        </main>
      </div>


      {isNewThreadModalOpen && (
        <div className="fixed inset-0 bg-white/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all">
          <form onSubmit={handleCreateThread} className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-blue-600"></div>

            <div className="flex items-center gap-2 text-blue-600 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 0 1-2.25 2.25M16.5 7.5V18a2.25 2.25 0 0 0 2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 0 0 2.25 2.25h13.5M6 7.5h3v3H6v-3Z" />
              </svg>
              <h3 className="text-base font-bold text-slate-900">Nuevo Hilo de Soporte</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Asunto del ticket</label>
                <input
                  type="text"
                  required
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500"
                  placeholder="Ej. Error en timbrado de factura"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Descripción inicial</label>
                <textarea
                  required
                  rows={4}
                  value={newThreadBody}
                  onChange={e => setNewThreadBody(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-900 focus:outline-none focus:border-blue-500 resize-none"
                  placeholder="Explica a detalle el caso..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 text-xs font-bold mt-6 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsNewThreadModalOpen(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2.5 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-sm"
              >
                Crear Ticket
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}