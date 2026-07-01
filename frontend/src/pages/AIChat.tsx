import React, { useState, useEffect, useRef } from 'react';
import { useStore, ChatMessage } from '../store';
import { 
  Send, 
  Mic, 
  MicOff, 
  FileText, 
  ChevronRight,
  Database,
  ArrowRight,
  User,
  Bot
} from 'lucide-react';

export const AIChat: React.FC = () => {
  const { chatHistory, queryChat, fetchChatHistory } = useStore();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Web Speech API Voice Recognizer setup
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    fetchChatHistory();
    
    // Initialize Web Speech Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';

      rec.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        setQuestion(transcript);
        setIsRecording(false);
      };

      rec.onerror = () => {
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    const q = question;
    setQuestion('');
    setLoading(true);
    await queryChat(q);
    setLoading(false);
  };

  const handleVoiceInput = () => {
    if (!recognition) {
      alert("Web Speech API is not supported in this browser. Try Chrome/Edge.");
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      setIsRecording(true);
      recognition.start();
    }
  };

  const suggestions = [
    "Which defects are critical?",
    "Show all damaged assets.",
    "Generate maintenance summary.",
    "Show projects near Bengaluru."
  ];

  const handleSuggestionClick = async (sug: string) => {
    setLoading(true);
    await queryChat(sug);
    setLoading(false);
  };

  // Static list of RAG indexed documents
  const indexedDocuments = [
    { name: 'DICC_Asset_Inspection_Guide_2026.pdf', chunks: 14, status: 'indexed' },
    { name: 'Regulator_Safety_Codes_Grid_D.pdf', chunks: 28, status: 'indexed' },
    { name: 'SolarCorp_Panel_Specs_V4.pdf', chunks: 8, status: 'indexed' }
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] select-none">
      
      {/* Left Chat Window */}
      <div className="flex-1 flex flex-col h-full bg-brand-bg/10 p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-brand-text uppercase tracking-wider">AI RAG Assistant</h3>
          <p className="text-xs text-brand-muted mt-0.5">Chat with indexed reports, regulatory codes, and structural inventories.</p>
        </div>

        {/* Message Feed area */}
        <div className="flex-1 bg-slate-950/80 border border-brand-border/60 rounded-xl p-5 overflow-y-auto space-y-4 min-h-0">
          {chatHistory.map((msg) => {
            const isUser = msg.sender === 'user';
            const isSystem = msg.sender === 'system';
            
            if (isSystem) {
              return (
                <div key={msg.id} className="text-center text-[10px] text-brand-muted bg-slate-900/30 py-1.5 rounded-lg border border-brand-border/20">
                  {msg.message}
                </div>
              );
            }

            return (
              <div 
                key={msg.id}
                className={`flex items-start space-x-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs border border-brand-border/80">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                
                <div className={`max-w-[70%] p-4 rounded-xl text-xs leading-relaxed space-y-2 shadow-md ${
                  isUser 
                    ? 'bg-cyan-500/10 text-brand-text border border-cyan-500/20' 
                    : 'bg-slate-900/60 text-brand-text border border-brand-border'
                }`}>
                  <p className="whitespace-pre-line">{msg.message}</p>
                  
                  {/* Citations / Source cards */}
                  {!isUser && msg.sources && msg.sources.length > 0 && (
                    <div className="pt-2.5 border-t border-brand-border/30 mt-2.5 text-[9px] text-brand-muted space-y-1">
                      <span className="font-bold text-cyan-400 uppercase tracking-wide">Sources Cited:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {msg.sources.map((src, idx) => (
                          <span key={idx} className="bg-slate-950 border border-brand-border/80 px-2 py-0.5 rounded text-[8px] font-medium">
                            {src}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {isUser && (
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-brand-muted text-xs border border-brand-border">
                    <User className="w-4 h-4 text-cyan-400" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Typing loader */}
          {loading && (
            <div className="flex items-start space-x-3 justify-start">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-purple-600 flex items-center justify-center text-white text-xs animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-slate-900/60 text-brand-muted border border-brand-border p-4 rounded-xl text-xs flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>RAG index scanning...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input box */}
        <div className="space-y-3">
          {/* Suggestions row */}
          <div className="flex flex-wrap gap-2">
            {suggestions.map((sug, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(sug)}
                className="px-3 py-1.5 rounded-full border border-brand-border/60 bg-slate-900/40 text-[10px] font-semibold text-brand-muted hover:text-cyan-400 hover:border-cyan-500/40 transition-colors flex items-center space-x-1"
              >
                <span>{sug}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            ))}
          </div>

          {/* Text Input area */}
          <form onSubmit={handleSend} className="flex items-center space-x-2.5">
            <button
              type="button"
              onClick={handleVoiceInput}
              className={`p-3 rounded-xl border transition-all ${
                isRecording 
                  ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse' 
                  : 'bg-slate-900/40 border-brand-border/80 text-brand-muted hover:text-brand-text'
              }`}
              title="Voice assistant Speech-to-Text"
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <input
              type="text"
              placeholder={isRecording ? "Listening to query..." : "Ask drone telemetry assistant..."}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 bg-slate-950 border border-brand-border/80 rounded-xl px-4 py-3 text-xs text-brand-text placeholder-brand-muted focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/10"
            />

            <button
              type="submit"
              className="p-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold flex items-center justify-center transition-all shadow-lg shadow-cyan-500/15"
            >
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>

      {/* Right Document list sidebar */}
      <div className="w-80 border-l border-brand-border/60 flex flex-col h-full bg-brand-bg/20 p-6 space-y-4">
        <div>
          <h4 className="text-xs font-bold text-brand-text uppercase tracking-wider">Vector Database</h4>
          <p className="text-[10px] text-brand-muted mt-0.5">ChromaDB semantic index directories</p>
        </div>

        <div className="space-y-3">
          {indexedDocuments.map((doc, idx) => (
            <div 
              key={idx}
              className="p-3 bg-slate-900/35 border border-brand-border/60 rounded-xl flex items-center justify-between"
            >
              <div className="flex items-center space-x-2.5 truncate">
                <FileText className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                <div className="truncate">
                  <h5 className="text-[11px] font-semibold text-brand-text truncate">{doc.name}</h5>
                  <p className="text-[9px] text-brand-muted">{doc.chunks} vector chunks indexed</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-brand-muted" />
            </div>
          ))}
        </div>

        {/* ChromaDB Status banner */}
        <div className="mt-auto p-4 bg-purple-500/5 rounded-xl border border-purple-500/10 flex items-center space-x-3">
          <Database className="w-5 h-5 text-purple-400" />
          <div>
            <p className="text-[10px] font-bold text-brand-text uppercase">ChromaDB Online</p>
            <p className="text-[9px] text-brand-muted">Embedding engine model text-embedding-3</p>
          </div>
        </div>
      </div>

    </div>
  );
};
