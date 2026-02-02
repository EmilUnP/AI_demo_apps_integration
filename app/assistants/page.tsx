'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ChatInterface from '../components/ChatInterface';

interface Assistant {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji fallback
  image: string; // path to image in public folder
  color: string;
  bgGradient: string;
  apiKey: string;
  apiId: string;
}

// Try single API key first, then fall back to per-assistant keys
const getApiKey = (index: number) => {
  // First try single API key (if all assistants use same key)
  const singleKey = process.env.NEXT_PUBLIC_API_KEY;
  if (singleKey) return singleKey;
  
  // Otherwise try per-assistant keys
  const keys = [
    process.env.NEXT_PUBLIC_API_KEY_1,
    process.env.NEXT_PUBLIC_API_KEY_2,
    process.env.NEXT_PUBLIC_API_KEY_3,
    process.env.NEXT_PUBLIC_API_KEY_4
  ];
  return keys[index] || '';
};

const assistants: Assistant[] = [
  {
    id: 'əmək-məcələsi-1760266330650',
    name: 'Əmək Məcələsi Köməkçisi',
    description: 'Əmək qanunvericiliyi və işçi hüquqları ilə bağlı suallara cavab verir',
    icon: '👨‍💼',
    image: '/assistants/assistant-purple.png', // Place image in public/assistants/assistant-1.png
    color: 'indigo',
    bgGradient: 'from-indigo-600/30 via-purple-600/20 to-indigo-600/30',
    apiKey: getApiKey(0),
    apiId: process.env.NEXT_PUBLIC_API_ID_1 || '1'
  },
  {
    id: 'farabi---access-|-business-trip-|-hp-dictionaries-1760079411198',
    name: 'SERP üzrə dəstəy',
    description: 'SERP üzrə dəstəy',
    icon: '💬',
    image: '/assistants/assistant-green.png', // Place image in public/assistants/assistant-2.png
    color: 'emerald',
    bgGradient: 'from-emerald-600/30 via-cyan-600/20 to-emerald-600/30',
    apiKey: getApiKey(1),
    apiId: process.env.NEXT_PUBLIC_API_ID_2 || '2'
  },
  {
    id: 'texniki-kömək-1760266330652',
    name: 'Texniki Kömək',
    description: 'Texniki problemlərin həllində kömək göstərir',
    icon: '🔧',
    image: '/assistants/assistant-pink.png', // Place image in public/assistants/assistant-3.png
    color: 'cyan',
    bgGradient: 'from-cyan-600/30 via-blue-600/20 to-cyan-600/30',
    apiKey: getApiKey(2),
    apiId: process.env.NEXT_PUBLIC_API_ID_3 || '3'
  },
  {
    id: 'satış-köməkçisi-1760266330653',
    name: 'Satış Köməkçisi',
    description: 'Məhsullar və xidmətlər haqqında məlumat verir',
    icon: '💰',
    image: '/assistants/assistant-orange.png', // Place image in public/assistants/assistant-4.png
    color: 'amber',
    bgGradient: 'from-amber-600/30 via-orange-600/20 to-amber-600/30',
    apiKey: getApiKey(3),
    apiId: process.env.NEXT_PUBLIC_API_ID_4 || '4'
  }
];

export default function AssistantsPage() {
  const [selectedAssistant, setSelectedAssistant] = useState<string | null>(null);
  
  // Debug: Log API keys on mount (check browser console)
  useEffect(() => {
    console.log('=== Assistant API Keys Debug ===');
    assistants.forEach((assistant, index) => {
      console.log(`Assistant ${index + 1} (${assistant.name}):`, {
        hasApiKey: !!assistant.apiKey && assistant.apiKey.trim() !== '',
        apiKeyLength: assistant.apiKey?.length || 0,
        apiKeyPreview: assistant.apiKey ? `${assistant.apiKey.substring(0, 10)}...` : 'MISSING',
        assistantId: assistant.id,
        apiId: assistant.apiId
      });
    });
  }, []);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* Decorative animated blobs */}
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full blur-3xl opacity-40 bg-animated-gradient" />
      <div className="pointer-events-none absolute top-1/3 -right-24 h-80 w-80 rounded-full blur-3xl opacity-40 bg-animated-gradient" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-96 w-96 rounded-full blur-3xl opacity-30 bg-animated-gradient" />
      
      {/* Header */}
      <header className="relative bg-slate-950/80 backdrop-blur border-b border-slate-800">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-indigo-400 hover:text-indigo-300 transition">
              Demo Səhifə
            </Link>
            <div className="flex gap-6">
              <Link href="/#features" className="text-slate-300 hover:text-indigo-300 transition">
                Xüsusiyyətlər
              </Link>
              <Link href="/" className="text-slate-300 hover:text-indigo-300 transition">
                Ana Səhifə
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 text-animated-gradient">
            Fərqli Assistləri Sınaqdan Keçirin
          </h1>
          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto">
            Aşağıdakı köməkçilərdən birini seçin və onunla söhbətə başlayın.
          </p>
        </div>

        {/* Assistant Cards Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {assistants.map((assistant, index) => (
            <button
              key={assistant.id}
              onClick={() => setSelectedAssistant(assistant.id)}
              className={`group relative overflow-hidden bg-slate-900/80 backdrop-blur p-8 rounded-3xl border transition-all duration-500 text-left hover:-translate-y-3 hover:shadow-2xl animate-fade-in-up card-hover-lift ${
                selectedAssistant === assistant.id
                  ? `border-indigo-500/60 shadow-2xl shadow-indigo-500/30 bg-gradient-to-br ${assistant.bgGradient} scale-105`
                  : 'border-slate-800 hover:border-slate-700 hover:shadow-xl'
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Animated Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${assistant.bgGradient} ${
                selectedAssistant === assistant.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-60'
              } transition-opacity duration-500`} />
              
              {/* Glow Effect */}
              <div className={`absolute -inset-0.5 bg-gradient-to-br ${assistant.bgGradient} rounded-3xl blur opacity-0 group-hover:opacity-50 transition-opacity ${
                selectedAssistant === assistant.id ? 'opacity-70' : ''
              }`} />
              
              {/* Content */}
              <div className="relative z-10 flex flex-col items-center text-center">
                {/* Image Container - Larger and Centered */}
                <div className={`mb-4 w-32 h-32 sm:w-36 sm:h-36 rounded-3xl flex items-center justify-center overflow-hidden bg-gradient-to-br ${
                  assistant.color === 'indigo' ? 'from-indigo-500/20 to-purple-500/20' :
                  assistant.color === 'emerald' ? 'from-emerald-500/20 to-cyan-500/20' :
                  assistant.color === 'cyan' ? 'from-cyan-500/20 to-blue-500/20' :
                  'from-amber-500/20 to-orange-500/20'
                } border-2 border-slate-700/50 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  {assistant.image && (
                    <img 
                      src={assistant.image} 
                      alt={assistant.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                
                <h3 className={`text-xl font-bold relative z-20 ${
                  selectedAssistant === assistant.id ? 'text-white' : 'text-slate-100'
                }`} style={{ textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)' }}>
                  {assistant.name}
                </h3>
              </div>

              {/* Selected Indicator with Ring */}
              {selectedAssistant === assistant.id && (
                <>
                  <div className="absolute top-4 right-4 z-20">
                    <div className="relative">
                      <div className="absolute inset-0 w-4 h-4 rounded-full bg-indigo-500 animate-ping opacity-75" />
                      <div className="relative w-4 h-4 rounded-full bg-indigo-500 ring-2 ring-indigo-500/50 ring-offset-2 ring-offset-slate-900" />
                    </div>
                  </div>
                  {/* Corner accent */}
                  <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${
                    assistant.color === 'indigo' ? 'from-indigo-500/20 to-transparent' :
                    assistant.color === 'emerald' ? 'from-emerald-500/20 to-transparent' :
                    assistant.color === 'cyan' ? 'from-cyan-500/20 to-transparent' :
                    'from-amber-500/20 to-transparent'
                  } rounded-bl-[3rem] rounded-tr-3xl`} />
                </>
              )}
            </button>
          ))}
        </div>

        {/* Embedded Chat Interface */}
        {selectedAssistant && (
          <div className="relative animate-fade-in-up">
            {/* Header with selected assistant info */}
            <div className="bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-slate-900/90 backdrop-blur border border-slate-800 rounded-t-3xl p-6 mb-0 shadow-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {(() => {
                    const selected = assistants.find(a => a.id === selectedAssistant);
                    return (
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
                        {selected?.image ? (
                          <>
                            <img 
                              src={selected.image} 
                              alt={selected.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling;
                                if (fallback) (fallback as HTMLElement).classList.remove('hidden');
                              }}
                            />
                            <span className="hidden text-2xl">{selected.icon}</span>
                          </>
                        ) : (
                          <span className="text-2xl">{selected?.icon}</span>
                        )}
                      </div>
                    );
                  })()}
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {assistants.find(a => a.id === selectedAssistant)?.name}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {assistants.find(a => a.id === selectedAssistant)?.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAssistant(null)}
                  className="px-5 py-2.5 bg-slate-800/70 backdrop-blur text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700 rounded-xl transition-all duration-200 text-sm font-semibold hover:border-slate-600 flex items-center gap-2 shadow-lg hover:shadow-xl"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Bağla
                </button>
              </div>
            </div>

            {/* Embedded Chat Interface */}
            <div className="relative bg-slate-900 border-x border-b border-slate-800 rounded-b-3xl overflow-hidden shadow-2xl" style={{ height: '600px' }}>
              {(() => {
                const selected = assistants.find(a => a.id === selectedAssistant);
                const hasApiKey = selected?.apiKey && selected.apiKey.trim() !== '';
                
                if (!hasApiKey) {
                  return (
                    <div className="flex items-center justify-center h-full p-6">
                      <div className="text-center max-w-md">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                          <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-200 mb-2">API Açarı Təyin Edilməyib</h3>
                        <p className="text-slate-400 mb-4">
                          Bu köməkçi üçün API açarı təyin edilməyib. Zəhmət olmasa <code className="text-xs bg-slate-800 px-2 py-1 rounded">.env.local</code> faylında müvafiq API açarını təyin edin.
                        </p>
                        <div className="text-left bg-slate-800/50 p-4 rounded-lg border border-slate-700 text-sm text-slate-300">
                          <p className="mb-2">Lazım olan dəyişən:</p>
                          <code className="text-amber-300">
                            NEXT_PUBLIC_API_KEY_{selected?.apiId || 'X'}
                          </code>
                        </div>
                      </div>
                    </div>
                  );
                }
                
                return (
                  <ChatInterface
                    assistantId={selectedAssistant}
                    assistantName={selected?.name || ''}
                    apiKey={selected?.apiKey || ''}
                    apiId={selected?.apiId || ''}
                    onClose={() => setSelectedAssistant(null)}
                  />
                );
              })()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

