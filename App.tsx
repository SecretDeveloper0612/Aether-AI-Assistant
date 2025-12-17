import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MessageSquare, LayoutGrid, Clock, Settings, Menu, X, Send, Play, Pause, ChevronRight } from 'lucide-react';
import { VoiceOrb } from './components/ui/VoiceOrb';
import { GlassCard } from './components/ui/GlassCard';
import { generateResponse } from './services/gemini';
import { AppMode, VoiceState, Message, VoiceHistoryItem } from './types';

// --- Helper Components ---

const NavigationItem = ({ active, icon: Icon, label, onClick }: { active: boolean, icon: any, label: string, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`flex items-center space-x-3 w-full p-3 rounded-2xl transition-all duration-300 ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const ChatMessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isAi = message.role === 'ai';
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`flex ${isAi ? 'justify-start' : 'justify-end'} mb-4`}
    >
      <div className={`max-w-[80%] p-4 rounded-2xl ${isAi ? 'bg-slate-800 text-slate-100 rounded-tl-sm' : 'bg-indigo-600 text-white rounded-tr-sm'}`}>
        <p className="leading-relaxed">{message.text}</p>
        <span className="text-xs opacity-50 mt-2 block">{message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </motion.div>
  );
};

// --- Main App Component ---

export default function App() {
  const [mode, setMode] = useState<AppMode>(AppMode.LANDING);
  const [voiceState, setVoiceState] = useState<VoiceState>(VoiceState.IDLE);
  const [transcript, setTranscript] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  
  // Refs for Speech API
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  // --- Speech Logic ---

  const speak = useCallback((text: string) => {
    if (!synthRef.current) return;
    
    // Cancel any current speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // Try to find a good voice
    const voices = synthRef.current.getVoices();
    const preferredVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('en')) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setVoiceState(VoiceState.SPEAKING);
    utterance.onend = () => setVoiceState(VoiceState.IDLE);
    
    synthRef.current.speak(utterance);
  }, []);

  const handleVoiceInput = useCallback(async (text: string) => {
    setVoiceState(VoiceState.PROCESSING);
    setTranscript(text);
    
    // Add user message
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);

    // Get AI Response
    const aiText = await generateResponse(text);
    
    // Add AI message
    const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'ai', text: aiText, timestamp: new Date() };
    setMessages(prev => [...prev, aiMsg]);

    speak(aiText);
  }, [speak]);

  useEffect(() => {
    // Initialize Speech Synthesis
    if (typeof window !== 'undefined') {
      synthRef.current = window.speechSynthesis;
      
      // Initialize Speech Recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setVoiceState(VoiceState.LISTENING);
        
        recognition.onresult = (event: any) => {
          const resultIndex = event.resultIndex;
          const result = event.results[resultIndex];
          const transcriptText = result[0].transcript;
          
          // Update visual transcript in real-time
          setTranscript(transcriptText);
          
          // Process final result
          if (result.isFinal) {
             handleVoiceInput(transcriptText);
          }
        };

        recognition.onend = () => {
           setVoiceState(VoiceState.IDLE);
        };
        
        recognitionRef.current = recognition;
      }
    }
  }, [handleVoiceInput]);

  const toggleListening = () => {
    if (voiceState === VoiceState.LISTENING) {
      recognitionRef.current?.stop();
      setVoiceState(VoiceState.IDLE);
    } else {
      try {
        setTranscript('');
        recognitionRef.current?.start();
      } catch (e) {
        console.error("Mic error", e);
        setVoiceState(VoiceState.IDLE);
      }
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const text = inputText;
    setInputText('');
    
    // Add user message
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text, timestamp: new Date() }]);
    
    setVoiceState(VoiceState.PROCESSING);
    const aiText = await generateResponse(text);
    setVoiceState(VoiceState.IDLE); // Text mode doesn't necessarily speak automatically
    
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'ai', text: aiText, timestamp: new Date() }]);
  };


  // --- Render Views ---

  const renderLanding = () => (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center min-h-screen relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-background to-background z-0" />
      
      <div className="z-10 flex flex-col items-center text-center px-4">
        <VoiceOrb state={VoiceState.IDLE} />
        
        <motion.h1 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mt-12 mb-6"
        >
          Talk. Think. <br/> Get Things Done.
        </motion.h1>
        
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="text-xl text-slate-400 mb-12 max-w-xl"
        >
          Your personal intelligent companion. Always listening, always ready.
        </motion.p>

        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <button 
            onClick={() => setMode(AppMode.VOICE)}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-semibold text-lg flex items-center gap-3 transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)]"
          >
            <Mic size={24} />
            Start Talking
          </button>
          <button 
            onClick={() => setMode(AppMode.CHAT)}
            className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-full font-semibold text-lg flex items-center gap-3 transition-all border border-slate-700"
          >
            <MessageSquare size={24} />
            Text Chat
          </button>
        </motion.div>
      </div>
    </motion.div>
  );

  const renderVoiceMode = () => (
    <motion.div 
      key="voice-mode"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full relative"
    >
      {/* Transcript Display */}
      <div className="absolute top-20 w-full max-w-2xl px-6 text-center z-10">
        <AnimatePresence mode='wait'>
          {transcript && (
            <motion.div
              key={transcript}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-2xl md:text-3xl font-light text-slate-200"
            >
              "{transcript}"
            </motion.div>
          )}
          {voiceState === VoiceState.SPEAKING && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-indigo-400 font-medium"
            >
              Speaking...
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="scale-125 md:scale-150 transform transition-transform duration-700">
        <VoiceOrb state={voiceState} />
      </div>

      {/* Controls */}
      <div className="absolute bottom-20 flex items-center gap-8">
        <button className="p-4 rounded-full bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 backdrop-blur-md transition-all">
          <Settings size={24} />
        </button>
        
        <button 
          onClick={toggleListening}
          className={`p-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-2xl ${
            voiceState === VoiceState.LISTENING 
              ? 'bg-red-500 shadow-red-500/50' 
              : 'bg-indigo-600 shadow-indigo-500/50'
          }`}
        >
          {voiceState === VoiceState.LISTENING ? <div className="w-8 h-8 bg-white rounded-sm" /> : <Mic size={32} color="white" />}
        </button>

        <button 
          onClick={() => setMode(AppMode.CHAT)}
          className="p-4 rounded-full bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 backdrop-blur-md transition-all"
        >
          <MessageSquare size={24} />
        </button>
      </div>
    </motion.div>
  );

  const renderDashboard = () => (
    <motion.div 
      key="dashboard"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="p-6 md:p-10 h-full overflow-y-auto"
    >
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white mb-2">Good Morning</h2>
          <p className="text-slate-400">Here's your summary for today.</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold">
          AI
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <GlassCard delay={0.1} className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl">
              <Clock size={24} />
            </div>
            <h3 className="text-xl font-semibold text-slate-200">Today's Schedule</h3>
          </div>
          <div className="space-y-4">
            {[
              { time: '10:00 AM', title: 'Product Review', type: 'Work' },
              { time: '1:30 PM', title: 'Lunch with Team', type: 'Personal' },
              { time: '3:00 PM', title: 'Development Sprint', type: 'Work' },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-800/50 hover:bg-slate-800 transition-colors">
                <div className="flex gap-4">
                  <span className="text-slate-400 font-mono text-sm">{item.time}</span>
                  <span className="text-slate-200 font-medium">{item.title}</span>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-700 text-slate-300">{item.type}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard delay={0.2}>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-500/20 text-purple-400 rounded-xl">
              <LayoutGrid size={24} />
            </div>
            <h3 className="text-xl font-semibold text-slate-200">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
             <button className="p-4 bg-slate-800/50 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors text-center flex flex-col items-center gap-2">
                <Mic size={20} /> New Note
             </button>
             <button className="p-4 bg-slate-800/50 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors text-center flex flex-col items-center gap-2">
                <Clock size={20} /> Set Alarm
             </button>
             <button className="p-4 bg-slate-800/50 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors text-center flex flex-col items-center gap-2">
                <MessageSquare size={20} /> Summarize
             </button>
             <button className="p-4 bg-slate-800/50 rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors text-center flex flex-col items-center gap-2">
                <Settings size={20} /> Focus
             </button>
          </div>
        </GlassCard>

        <GlassCard delay={0.3} className="md:col-span-3 lg:col-span-3">
           <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-xl">
                <MessageSquare size={24} />
              </div>
              <h3 className="text-xl font-semibold text-slate-200">Recent Suggestions</h3>
            </div>
            <button className="text-indigo-400 text-sm hover:underline">View All</button>
           </div>
           <div className="flex flex-wrap gap-3">
             {["Draft a response to Sarah", "Research AI UI trends", "Order coffee", "Play lofi playlist"].map((tag, i) => (
                <button key={i} className="px-4 py-2 rounded-full bg-slate-800/80 border border-slate-700 hover:border-indigo-500 hover:text-indigo-400 transition-all text-sm text-slate-300">
                  {tag}
                </button>
             ))}
           </div>
        </GlassCard>
      </div>
    </motion.div>
  );

  const renderChat = () => (
    <motion.div 
      key="chat"
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="flex flex-col h-full"
    >
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {messages.length === 0 ? (
           <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
              <MessageSquare size={48} className="mb-4" />
              <p>Start a conversation...</p>
           </div>
        ) : (
          messages.map((msg) => <ChatMessageBubble key={msg.id} message={msg} />)
        )}
      </div>
      
      <div className="p-4 md:p-6 bg-slate-900/80 backdrop-blur-lg border-t border-slate-800">
        <div className="max-w-4xl mx-auto relative flex items-center gap-3">
          <button 
            onClick={() => setMode(AppMode.VOICE)}
            className="p-3 rounded-full bg-slate-800 text-slate-400 hover:text-indigo-400 transition-colors"
          >
            <Mic size={20} />
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 bg-slate-800/50 border border-slate-700 rounded-full px-6 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
          />
          <button 
            onClick={handleSendMessage}
            disabled={!inputText.trim()}
            className="p-3 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </motion.div>
  );

  // --- Layout Wrapper ---

  if (mode === AppMode.LANDING) {
    return renderLanding();
  }

  return (
    <div className="flex h-screen bg-background text-slate-200 overflow-hidden font-sans">
      {/* Sidebar */}
      <motion.aside 
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: sidebarOpen ? 280 : 80, opacity: 1 }}
        className="hidden md:flex flex-col h-full bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 z-20"
      >
        <div className="p-6 flex items-center justify-between">
          <div className={`font-bold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 ${!sidebarOpen && 'hidden'}`}>
            Aether
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
             {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavigationItem active={mode === AppMode.VOICE} icon={Mic} label={sidebarOpen ? "Voice Mode" : ""} onClick={() => setMode(AppMode.VOICE)} />
          <NavigationItem active={mode === AppMode.CHAT} icon={MessageSquare} label={sidebarOpen ? "Chat" : ""} onClick={() => setMode(AppMode.CHAT)} />
          <NavigationItem active={mode === AppMode.DASHBOARD} icon={LayoutGrid} label={sidebarOpen ? "Dashboard" : ""} onClick={() => setMode(AppMode.DASHBOARD)} />
          <NavigationItem active={mode === AppMode.HISTORY} icon={Clock} label={sidebarOpen ? "History" : ""} onClick={() => {}} />
        </nav>

        <div className="p-4">
          <NavigationItem active={mode === AppMode.SETTINGS} icon={Settings} label={sidebarOpen ? "Settings" : ""} onClick={() => {}} />
        </div>
      </motion.aside>

      {/* Mobile Nav Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-md z-30 flex items-center justify-between px-4 border-b border-slate-800">
         <span className="font-bold text-xl text-indigo-400">Aether</span>
         <button onClick={() => setSidebarOpen(true)} className="p-2">
            <Menu size={24} />
         </button>
      </div>

       {/* Mobile Sidebar Overlay */}
       <AnimatePresence>
         {sidebarOpen && (
           <motion.div 
             initial={{ x: "-100%" }}
             animate={{ x: 0 }}
             exit={{ x: "-100%" }}
             className="fixed inset-0 z-40 bg-background md:hidden"
           >
              <div className="p-4 flex justify-end">
                <button onClick={() => setSidebarOpen(false)}><X size={32} /></button>
              </div>
              <nav className="flex flex-col gap-4 p-8">
                 <button onClick={() => { setMode(AppMode.VOICE); setSidebarOpen(false); }} className="text-2xl font-bold text-left py-4 border-b border-slate-800">Voice Mode</button>
                 <button onClick={() => { setMode(AppMode.CHAT); setSidebarOpen(false); }} className="text-2xl font-bold text-left py-4 border-b border-slate-800">Chat</button>
                 <button onClick={() => { setMode(AppMode.DASHBOARD); setSidebarOpen(false); }} className="text-2xl font-bold text-left py-4 border-b border-slate-800">Dashboard</button>
              </nav>
           </motion.div>
         )}
       </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 relative h-full overflow-hidden pt-16 md:pt-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-background to-background pointer-events-none" />
        
        <AnimatePresence mode='wait'>
          {mode === AppMode.VOICE && renderVoiceMode()}
          {mode === AppMode.CHAT && renderChat()}
          {mode === AppMode.DASHBOARD && renderDashboard()}
        </AnimatePresence>
      </main>
    </div>
  );
}