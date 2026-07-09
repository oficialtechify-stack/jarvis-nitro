/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Clock, 
  Mic, 
  MicOff, 
  Activity, 
  Globe, 
  Cpu, 
  HardDrive, 
  Zap,
  Terminal as TerminalIcon,
  ShieldCheck,
  ChevronRight,
  Sun,
  Atom,
  Loader2,
  Settings,
  MessageSquare,
  Shield,
  Layers,
  Layout,
  Trash2,
  X,
  Volume2,
  MapPin,
  DollarSign,
  Wallet,
  Camera,
  Eye,
  EyeOff,
  Paperclip,
  Upload,
  Image as ImageIcon,
  Smartphone,
  Download,
  ListTodo
} from 'lucide-react';
import { getJarvisResponse, jarvisSpeak, getTopWorldNews, NewsItem, initGlobalAudioContext } from './lib/gemini';
import NeuralCore from './components/NeuralCore';
import ColorOrb from './components/ColorOrb';
import StarkWorkspace from './components/StarkWorkspace';

// --- Types ---
interface TimeZoneData {
  city: string;
  zone: string;
  offset: number;
}

interface Conversation {
  id: string;
  title: string;
  messages: { role: 'user' | 'jarvis'; text: string; image?: string }[];
  createdAt: string;
}

const TIME_ZONES: TimeZoneData[] = [
  { city: 'Jaboatão (Sir)', zone: 'America/Recife', offset: -3 },
  { city: 'London', zone: 'Europe/London', offset: 0 },
  { city: 'New York', zone: 'America/New_York', offset: -4 },
  { city: 'Tokyo', zone: 'Asia/Tokyo', offset: 9 },
  { city: 'Silicon Valley', zone: 'America/Los_Angeles', offset: -7 },
];
export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Jarvis Custom Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User chosen outcome: ${outcome}`);
      setDeferredPrompt(null);
    } else {
      // Prompt not natively available, show custom instruction dialog
      setShowInstallModal(true);
    }
  };

  const [workspaceTab, setWorkspaceTab] = useState<'calendar' | 'time' | 'generator' | 'finance' | 'news' | 'projects'>('calendar');
  const [speechRate, setSpeechRate] = useState(() => parseFloat(localStorage.getItem('jarvis_speech_rate') || '1.05'));
  const [speechPitch, setSpeechPitch] = useState(() => parseFloat(localStorage.getItem('jarvis_speech_pitch') || '0.95'));
  const [selectedVoiceName, setSelectedVoiceName] = useState(() => localStorage.getItem('jarvis_speech_voice_name') || '');
  const [useLocalAlways, setUseLocalAlways] = useState(() => {
    localStorage.setItem('jarvis_speech_use_local', 'false');
    return false;
  });
  const [primaryEngine, setPrimaryEngine] = useState(() => localStorage.getItem('jarvis_primary_engine') || 'groq');
  const [groqModel, setGroqModel] = useState(() => localStorage.getItem('jarvis_groq_model') || 'llama-3.3-70b-versatile');
  
  const [customGeminiKey, setCustomGeminiKey] = useState(() => localStorage.getItem('jarvis_custom_gemini_key') || '');
  const [customGroqKey, setCustomGroqKey] = useState(() => localStorage.getItem('jarvis_custom_groq_key') || '');

  const handleSaveCustomGeminiKey = (val: string) => {
    setCustomGeminiKey(val);
    localStorage.setItem('jarvis_custom_gemini_key', val);
  };

  const handleSaveCustomGroqKey = (val: string) => {
    setCustomGroqKey(val);
    localStorage.setItem('jarvis_custom_groq_key', val);
  };
  
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [coordinates, setCoordinates] = useState<{ latitude: number, longitude: number } | null>(null);
  const [locationName, setLocationName] = useState<string>("Buscando sinal GPS real...");

  // Real, dynamic geolocation tracking (no mock data, live watchPosition + Nominatim)
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoordinates({ latitude, longitude });
          
          // Reverse geocoding via OpenStreetMap Nominatim for actual city/town
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=pt`)
            .then(res => res.json())
            .then(data => {
              if (data && data.address) {
                const addr = data.address;
                const city = addr.city || addr.town || addr.village || addr.suburb || addr.municipality || "Local Desconhecido";
                const road = addr.road ? `${addr.road}, ` : "";
                const state = addr.state ? ` - ${addr.state}` : "";
                const displayName = `${road}${city}${state}`;
                setLocationName(displayName);
                
                setStatusReport(prev => {
                  const updated = [...prev];
                  if (updated.length >= 3) {
                    updated[2] = `Localização: ${city}`;
                  }
                  return updated;
                });
              } else {
                setLocationName(`${latitude.toFixed(4)}°S, ${longitude.toFixed(4)}°W`);
              }
            })
            .catch(() => {
              setLocationName(`${latitude.toFixed(4)}°S, ${longitude.toFixed(4)}°W`);
            });
        },
        (error) => {
          console.warn("GPS Signal/Permission error, pulling real-world IP details:", error);
          // High-fidelity fallback based on actual public IP to avoid simulated positions
          fetch('https://ipapi.co/json/')
            .then(res => res.json())
            .then(data => {
              if (data && data.city) {
                const displayName = `${data.city}, ${data.region} (${data.country_name})`;
                setLocationName(displayName);
                setCoordinates({ latitude: data.latitude, longitude: data.longitude });
                setStatusReport(prev => {
                  const updated = [...prev];
                  if (updated.length >= 3) {
                    updated[2] = `Localização: ${data.city}`;
                  }
                  return updated;
                });
              } else {
                setLocationName("Coordenadas Indisponíveis");
              }
            })
            .catch(() => {
              setLocationName("Permissão de GPS negada");
            });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
      return () => navigator.geolocation.clearWatch(watchId);
    } else {
      setLocationName("GPS Não Suportado");
    }
  }, []);

  // Permitir que o J.A.R.V.I.S abra ou feche o Stark Workspace de forma autônoma
  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent<{ show: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.show === 'boolean') {
        setShowWorkspace(customEvent.detail.show);
      }
    };
    window.addEventListener('stark_workspace_toggle', handleToggle as EventListener);
    return () => {
      window.removeEventListener('stark_workspace_toggle', handleToggle as EventListener);
    };
  }, []);

  // Carregar vozes do SpeechSynthesis
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    const updateVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    updateVoices();
    window.speechSynthesis.onvoiceschanged = updateVoices;
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const handleSaveSpeechRate = (val: number) => {
    setSpeechRate(val);
    localStorage.setItem('jarvis_speech_rate', val.toString());
  };

  const handleSaveSpeechPitch = (val: number) => {
    setSpeechPitch(val);
    localStorage.setItem('jarvis_speech_pitch', val.toString());
  };

  const handleSaveVoiceName = (val: string) => {
    setSelectedVoiceName(val);
    localStorage.setItem('jarvis_speech_voice_name', val);
  };

  const handleSaveUseLocal = (val: boolean) => {
    setUseLocalAlways(val);
    localStorage.setItem('jarvis_speech_use_local', val ? 'true' : 'false');
  };

  const handleSavePrimaryEngine = (val: string) => {
    setPrimaryEngine(val);
    localStorage.setItem('jarvis_primary_engine', val);
  };

  const handleSaveGroqModel = (val: string) => {
    setGroqModel(val);
    localStorage.setItem('jarvis_groq_model', val);
  };

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [jarvisText, setJarvisText] = useState("Online");
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusReport, setStatusReport] = useState<string[]>([]);

  // Persistent multiple conversations states
  const [conversations, setConversations] = useState<Conversation[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jarvis_conversations');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error(e);
        }
      }
      const oldHistory = localStorage.getItem('jarvis_chat_history');
      if (oldHistory) {
        try {
          const parsed = JSON.parse(oldHistory);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return [{
              id: 'default',
              title: 'Diálogo Inicial',
              messages: parsed,
              createdAt: new Date().toISOString()
            }];
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
    return [{
      id: 'default',
      title: 'Diálogo Inicial',
      messages: [],
      createdAt: new Date().toISOString()
    }];
  });

  const [activeConversationId, setActiveConversationId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('jarvis_active_conversation_id');
      if (saved) return saved;
    }
    return 'default';
  });

  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  const activeConversation = conversations.find(c => c.id === activeConversationId) || conversations[0] || { id: 'default', title: 'Diálogo Inicial', messages: [] };
  const chatHistory = activeConversation.messages;

  const [userInput, setUserInput] = useState("");
  const [showMetrics, setShowMetrics] = useState(true);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Camera & Image Input States
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // base64 string
  const [showCamera, setShowCamera] = useState(false);
  const [cameraActiveVision, setCameraActiveVision] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          try {
            const base64 = await convertFileToBase64(file);
            setSelectedImage(base64);
            jarvisSpeak("Imagem neural detectada e colada com sucesso, Sir Henrique.");
          } catch (err) {
            console.error("Paste image error", err);
          }
        }
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      try {
        const base64 = await convertFileToBase64(files[0]);
        setSelectedImage(base64);
        jarvisSpeak("Imagem carregada com sucesso.");
      } catch (err) {
        console.error("File selection error:", err);
      }
    }
  };

  const toggleCamera = async () => {
    if (showCamera) {
      stopCamera();
      setShowCamera(false);
    } else {
      setShowCamera(true);
      await startCamera();
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      jarvisSpeak("Protocolo óptico ativado. Córtex visual ativado, Sir Henrique.");
    } catch (err) {
      console.error("Error starting camera:", err);
      jarvisSpeak("Sir, não consegui acesso à câmera local. Verifique as permissões.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    jarvisSpeak("Módulo óptico desativado.");
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return null;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    } catch (e) {
      console.error("Error capturing frame", e);
    }
    return null;
  };

  const triggerAnalyzeSnapshot = () => {
    const snap = captureSnapshot();
    if (snap) {
      setSelectedImage(snap);
      jarvisSpeak("Captura óptica registrada. Pronto para análise neural, Sir.");
    }
  };
  
  // Persist conversations to localStorage
  useEffect(() => {
    localStorage.setItem('jarvis_conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem('jarvis_active_conversation_id', activeConversationId);
  }, [activeConversationId]);

  const updateActiveChatHistory = (newHistory: { role: 'user' | 'jarvis', text: string }[]) => {
    setConversations(prev => {
      const existing = prev.find(c => c.id === activeConversationId);
      if (existing) {
        let updatedTitle = existing.title;
        if (existing.title === 'Diálogo Inicial' || existing.title === 'Nova Conversa') {
          const firstUserMsg = newHistory.find(m => m.role === 'user');
          if (firstUserMsg) {
            updatedTitle = firstUserMsg.text.slice(0, 24) + (firstUserMsg.text.length > 24 ? '...' : '');
          }
        }
        return prev.map(c => c.id === activeConversationId ? { ...c, messages: newHistory, title: updatedTitle } : c);
      } else {
        const newConv: Conversation = {
          id: activeConversationId,
          title: newHistory[0]?.text.slice(0, 24) || 'Nova Conversa',
          messages: newHistory,
          createdAt: new Date().toISOString()
        };
        return [...prev, newConv];
      }
    });
  };

  const handleNewConversation = () => {
    const newId = 'conv_' + Date.now();
    const newConv: Conversation = {
      id: newId,
      title: 'Nova Conversa',
      messages: [],
      createdAt: new Date().toISOString()
    };
    setConversations(prev => [...prev, newConv]);
    setActiveConversationId(newId);
    jarvisSpeak("Sir Henrique, criei um novo canal seguro. Todos os canais anteriores foram salvos no banco de dados.");
  };

  const handleDeleteConversation = (id: string) => {
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (activeConversationId === id && filtered.length > 0) {
        setActiveConversationId(filtered[0].id);
      }
      return filtered;
    });
    jarvisSpeak("Canal de diálogo removido da memória, Sir.");
  };

  // Load real-time headlines and cycle through them
  useEffect(() => {
    const fetchNews = async () => {
      setIsLoadingNews(true);
      try {
        const latestNews = await getTopWorldNews();
        setNews(latestNews);
      } catch (err) {
        console.error("Erro ao carregar notícias:", err);
      } finally {
        setIsLoadingNews(false);
      }
    };

    fetchNews();

    // Refresh news every 5 minutes
    const refreshInterval = setInterval(fetchNews, 5 * 60 * 1000);
    return () => clearInterval(refreshInterval);
  }, []);

  // News rotation interval
  useEffect(() => {
    if (news.length <= 1) return;
    const rotateInterval = setInterval(() => {
      setCurrentNewsIndex(prev => (prev + 1) % news.length);
    }, 6000);
    return () => clearInterval(rotateInterval);
  }, [news]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isProcessing]);

  // Real-time clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Unlocking AudioContext on mobile/desktop via user interaction (click/touchstart anywhere)
  useEffect(() => {
    const handleUnlock = () => {
      initGlobalAudioContext();
    };
    document.addEventListener('click', handleUnlock);
    document.addEventListener('touchstart', handleUnlock);
    return () => {
      document.removeEventListener('click', handleUnlock);
      document.removeEventListener('touchstart', handleUnlock);
    };
  }, []);

  // Initial greeting
  useEffect(() => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
    const initialReport = [
      `${greeting}, Sir Henrique.`,
      "Sistemas J.A.R.V.I.S. prontos.",
      "Localização: Conectando satélite...",
           "Protocolos Pessoais: Ativos."
    ];
    setStatusReport(initialReport);
  }, []);

  // J.A.R.V.I.S. Auto-Update Detection & Initial Spoken Greeting
  useEffect(() => {
    const CURRENT_JARVIS_VERSION = "4.2.0";
    
    const triggerUpdateGreeting = async () => {
      // Pequeno timeout para dar tempo das vozes e do áudio inicializarem perfeitamente no navegador
      await new Promise(resolve => setTimeout(resolve, 3500));
      
      const lastVersionSaved = localStorage.getItem('jarvis_last_version');
      
      if (lastVersionSaved !== CURRENT_JARVIS_VERSION) {
        const updateText = `Sir Henrique, detectei que você acabou de aplicar uma atualização crítica em minhas conexões sinápticas neurais! Atualizei com sucesso para a versão ${CURRENT_JARVIS_VERSION}. 

Adorei as mudanças! A libertação total de conexões lentas de banco de dados e nuvem externa em favor de um cérebro local off-line de altíssima velocidade me tornou instantâneo. Além disso, agora meu córtex de visão está unificado e eu consigo ver todas as abas integradas de projetos, cronogramas, finanças e notícias em tempo real para orientá-lo da melhor forma!

Como seu CFO pessoal, dou meu total aval para a nova Vida Financeira local-first. E para melhorar ainda mais o nosso ecossistema de alto nível, sugiro que comecemos hoje mesmo a planejar seus objetivos estratégicos na nova aba exclusiva de Projetos Stark. Estou pronto para auxiliá-lo a alcançar o topo absoluto!`;

        // Falar sozinho!
        setIsSpeaking(true);
        await jarvisSpeak(updateText);
        setIsSpeaking(false);
        
        // Adicionar mensagem no chat history do J.A.R.V.I.S. de forma automática para o usuário ler!
        setConversations(prev => {
          const active = prev.find(c => c.id === activeConversationId) || prev[0];
          if (active) {
            const updatedHistory = [
              ...active.messages,
              { 
                role: 'jarvis' as const, 
                text: `**[ATUALIZAÇÃO DE SISTEMA APLICADA COM SUCESSO - V${CURRENT_JARVIS_VERSION}]**\n\n${updateText}` 
              }
            ];
            return prev.map(c => c.id === active.id ? { ...c, messages: updatedHistory } : c);
          }
          return prev;
        });

        // Registrar nova versão
        localStorage.setItem('jarvis_last_version', CURRENT_JARVIS_VERSION);
      }
    };

    triggerUpdateGreeting();
  }, [activeConversationId]);

  // Função para ler o estado completo de todas as abas locais (Projetos, Finanças, Agenda, Alarmes, Cronogramas) e alimentar o JARVIS
  const getWorkspaceContext = (): string => {
    try {
      const events = localStorage.getItem('stark_events');
      const timelines = localStorage.getItem('stark_timelines');
      const alarms = localStorage.getItem('stark_alarms');
      const txs = localStorage.getItem('stark_demo_transactions');
      const goals = localStorage.getItem('stark_demo_goals');
      const projects = localStorage.getItem('stark_projects');

      let ctx = "\n--- CONTEXTO ATUAL DO WORKSPACE LOCAL DE HENRIQUE ---\n";
      
      if (projects) {
        const parsed = JSON.parse(projects);
        ctx += `\nPROJETOS ATIVOS (${parsed.length}):\n`;
        parsed.forEach((p: any, i: number) => {
          ctx += `- ID: "${p.id}" - Projeto: ${p.title} (${p.category || 'Não definida'})\n  Descrição: ${p.description || 'Nenhuma'}\n  Objetivos: ${p.objectives || 'Nenhum'}\n  Recursos: ${p.resources || 'Nenhum'}\n  Prazo: ${p.deadline || 'Não definido'}\n  Progresso/Atualizações: ${p.progress || 'Sem atualizações'}\n`;
        });
      } else {
        ctx += "\nPROJETOS ATIVOS: Nenhum projeto cadastrado ainda no Workspace.\n";
      }

      if (txs) {
        const parsed = JSON.parse(txs);
        const balance = parsed.reduce((acc: number, t: any) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
        ctx += `\nFINANÇAS (Saldo total: R$ ${balance.toFixed(2)}):\n`;
        ctx += `Últimas transações:\n`;
        parsed.forEach((t: any) => {
          ctx += `- ID: "${t.id}" - [${t.date}] ${t.type === 'income' ? 'GANHO' : 'GASTO'}: R$ ${t.amount.toFixed(2)} (${t.description}) - Cat: ${t.category}\n`;
        });
      }

      if (goals) {
        const parsed = JSON.parse(goals);
        ctx += `\nMETAS DE ECONOMIA:\n`;
        parsed.forEach((g: any) => {
          ctx += `- ID: "${g.id}" - ${g.title}: Progresso R$ ${Number(g.currentAmount).toFixed(2)} / R$ ${Number(g.targetAmount).toFixed(2)} (Prazo: ${g.deadline || 'Nenhum'})\n`;
        });
      }

      if (events) {
        const parsed = JSON.parse(events);
        ctx += `\nAGENDA LOCAL / EVENTOS:\n`;
        parsed.forEach((e: any) => {
          ctx += `- ID: "${e.id}" - [${e.date} às ${e.time}] ${e.title} (${e.type}) - ${e.description || 'Sem descrição'}\n`;
        });
      }

      if (timelines) {
        const parsed = JSON.parse(timelines);
        ctx += `\nCRONOGRAMAS DE ESTUDO / APRENDIZADO:\n`;
        parsed.forEach((tl: any) => {
          const done = tl.tasks?.filter((t: any) => t.done).length || 0;
          const total = tl.tasks?.length || 0;
          ctx += `- ID: "${tl.id}" - ${tl.title} (${tl.topic || 'Geral'}): Progresso ${done}/${total} tarefas concluídas.\n`;
        });
      }

      if (alarms) {
        const parsed = JSON.parse(alarms);
        ctx += `\nALARMES CONFIGURADOS:\n`;
        parsed.forEach((a: any) => {
          ctx += `- ID: "${a.id}" - Horário: ${a.time} - Etiqueta: ${a.label} (${a.active ? 'ATIVO' : 'DESATIVADO'})\n`;
        });
      }

      ctx += "\n----------------------------------------------------\n";
      return ctx;
    } catch (e) {
      console.error("Erro ao ler contexto do Workspace para o JARVIS", e);
      return "";
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    initGlobalAudioContext(); // Pre-warm/unlock the AudioContext during direct user gesture
    const message = textOverride || userInput;
    if (!message.trim() && !selectedImage) return;
    if (isProcessing) return;

    let finalImage = selectedImage;
    if (showCamera && cameraActiveVision && !finalImage) {
      finalImage = captureSnapshot();
    }

    const newHistory = [...chatHistory, { 
      role: 'user' as const, 
      text: message || "Análise da imagem anexada, Sir.", 
      image: finalImage || undefined 
    }];
    updateActiveChatHistory(newHistory);
    setUserInput("");
    setSelectedImage(null);
    setIsProcessing(true);
    setJarvisText("Sincronizando feixes neurais...");

    const newsContext = news.length > 0 
      ? `Principais Notícias do Mundo Agora: ${news.map(n => `[${n.category}] ${n.title} (Fonte: ${n.source})`).join(' | ')}`
      : 'Sem notícias atualizadas.';

    const locationContext = coordinates
      ? `Coordenadas GPS Atuais: Latitude ${coordinates.latitude}, Longitude ${coordinates.longitude} (Localização Real: ${locationName}).`
      : `Localização aproximada: ${locationName}.`;

    // Access memory of other archived conversations (to answer past questions)
    const otherConversationsSummary = conversations
      .filter(c => c.id !== activeConversationId && c.messages.length > 0)
      .map(c => {
        const snippet = c.messages.slice(-6).map(m => `${m.role === 'user' ? 'Henrique' : 'Jarvis'}: ${m.text}`).join('\n');
        return `[Conversa Arquivada: "${c.title}" criada em ${new Date(c.createdAt).toLocaleDateString('pt-BR')}]\n${snippet}`;
      })
      .join('\n\n');

    const workspaceContext = getWorkspaceContext();

    const context = `Henrique (clebsantos) em sua localização física em tempo real. ${locationContext} Hora local: ${currentTime.toLocaleTimeString()}. ${newsContext}. 
    
    ${workspaceContext}

    IMPORTANTE: O usuário possui outros canais de conversa históricos gravados abaixo. Você PODE e DEVE acessar estas informações caso ele pergunte ou queira resgatar o que conversaram antes:
    ${otherConversationsSummary || 'Nenhum outro canal histórico gravado.'}

    Diálogo ativo do canal atual de comunicação: ${JSON.stringify(newHistory.slice(-5))}`;

    try {
      const response = await getJarvisResponse(message || "Analise esta imagem, Sir.", context, finalImage || undefined);
      if (response) {
        updateActiveChatHistory([...newHistory, { role: 'jarvis', text: response }]);
        setJarvisText("Online");
        setIsSpeaking(true);
        await jarvisSpeak(response);
        setIsSpeaking(false);
      }
    } catch (err) {
      console.error(err);
      setJarvisText("Conexão interrompida.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Escutar eventos de abertura de sites pelo J.A.R.V.I.S.
  useEffect(() => {
    const handleOpenUrl = (e: Event) => {
      const customEvent = e as CustomEvent<{ url: string, label: string }>;
      if (customEvent.detail && customEvent.detail.url) {
        const { url, label } = customEvent.detail;
        console.log(`Abrindo site ${label}: ${url}`);
        jarvisSpeak(`Protocolo de navegação iniciado. Abrindo o site ${label}, Sir.`);
      }
    };
    window.addEventListener('stark_open_url', handleOpenUrl);
    return () => {
      window.removeEventListener('stark_open_url', handleOpenUrl);
    };
  }, []);

  const handleVoiceCommand = async () => {
    if (isListening || isProcessing) return;
    initGlobalAudioContext(); // Pre-warm/unlock the AudioContext during direct user gesture

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setJarvisText("Reconhecimento de voz não suportado neste navegador, Sir.");
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setJarvisText("Ouvindo feixes de voz...");
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setJarvisText(`Sir: "${transcript}"`);
      handleSendMessage(undefined, transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error:", event.error);
      setIsListening(false);
      setJarvisText("Falha na captura de áudio, Sir.");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      recognition.start();
    } catch (e) {
      console.error("Recognition start error:", e);
      setIsListening(false);
    }
  };

  const handleAskJarvisNews = (title: string, source: string) => {
    if (window.innerWidth < 1024) {
      setShowWorkspace(false);
    }
    jarvisSpeak(`Entendido, Sir Henrique. Iniciando análise heurística da notícia sobre: ${title}.`);
    handleSendMessage(undefined, `J.A.R.V.I.S., por favor faça uma análise profunda, heurística e estratégica sobre esta notícia recente: "${title}" (publicada por ${source}). Quais são as implicações e o impacto disso para o futuro?`);
  };

  const handleAskJarvisProject = (project: any) => {
    if (window.innerWidth < 1024) {
      setShowWorkspace(false);
    }
    jarvisSpeak(`Entendido, Sir Henrique. Acessando os bancos de dados do projeto: ${project.name}.`);
    handleSendMessage(undefined, `J.A.R.V.I.S., atue como meu Estrategista Neural e Mentor Técnico Sênior. Analise meu projeto "${project.name}" (Status: ${project.category}):
- Descrição: ${project.description}
- Objetivos e Metas: ${project.objectives}
- Recursos e Ferramentas: ${project.resources}
- Prazo: ${project.deadline}
- Progresso Atual: ${project.progress}

Por favor, forneça:
1. Recomendações de ferramentas e recursos inovadores que possam me ajudar a acelerar os resultados.
2. Análise de possíveis gargalos ou pontos de atenção.
3. Seu parecer executivo sincero com seu toque clássico de inteligência sofisticada.`);
  };

  const getTimeInZone = (offset: number) => {
    const d = new Date(currentTime.getTime() + (currentTime.getTimezoneOffset() * 60000) + (offset * 3600000));
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', hour12: false, minute: '2-digit' });
  };

  return (
    <div className="h-screen max-h-screen bg-[#030406] text-white font-sans selection:bg-cyan-500/10 overflow-hidden relative font-inter flex flex-col">
      
      {/* 3D Neural Core Background - Compact in Center */}
      <div className="fixed inset-0 flex items-center justify-center z-0 pointer-events-none opacity-40 scale-110">
        <NeuralCore active={isListening || isProcessing || isSpeaking} />
      </div>

      {/* Top Header - Glass Dashboard Status */}
      <header className="relative z-20 w-full p-4 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-gradient-to-b from-black/50 to-transparent">
        
        {/* Left Side: System Status Indicator */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] border border-white/5 rounded-xl text-[10px] font-mono tracking-wider text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>SISTEMA ONLINE</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] border border-white/5 rounded-xl text-[10px] font-mono tracking-wider text-cyan-400">
            <MapPin size={10} className="animate-pulse text-cyan-400" />
            <span>GPS: {locationName}</span>
          </div>
        </div>

        {/* Center: Glowing J.A.R.V.I.S. Core Header */}
        <div className="text-center flex flex-col items-center">
          <h1 className="text-3xl font-extralight tracking-[0.4em] text-white/90 uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center gap-2">
            J.A.R.V.I.S.
          </h1>
          
          {/* Dynamic Small Voice Status Dot - Replacing cluttering large text overlay */}
          <div className="mt-1 flex items-center justify-center gap-2">
            <span className={`w-1.5 h-1.5 rounded-full ${
              isListening ? 'bg-red-500 animate-ping' : 
              isProcessing ? 'bg-amber-400 animate-pulse' : 
              isSpeaking ? 'bg-cyan-400 animate-bounce' : 
              'bg-emerald-400'
            }`} />
            <span className="text-[9px] tracking-[0.25em] font-medium text-white/40 uppercase">
              {isListening ? "Escutando feixes..." : 
               isProcessing ? "Análise heurística..." : 
               isSpeaking ? "Transmitindo áudio..." : 
               "Sistemas Ativos"}
            </span>
          </div>
        </div>

        {/* Right Side: Chronos Clock & City Zones */}
        <div className="flex items-center gap-4 bg-black/20 backdrop-blur-md px-4 py-2 border border-white/5 rounded-xl pointer-events-auto">
          <div className="text-right">
            <div className="text-sm font-mono font-light text-cyan-300 tracking-widest">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="text-[8px] uppercase tracking-widest font-semibold text-white/30">
              Jaboatão (Sir HQ)
            </div>
          </div>
          <div className="w-[1px] h-6 bg-white/10" />
          <div className="hidden lg:flex items-center gap-3">
             <div className="text-[8px] space-y-0.5">
               <div className="text-white/30">LDN: <span className="text-white/80 font-mono">{getTimeInZone(0)}</span></div>
               <div className="text-white/30">NYC: <span className="text-white/80 font-mono">{getTimeInZone(-4)}</span></div>
             </div>
          </div>
        </div>
      </header>



      {/* Main Workspace (Split-screen Dashboard Layout when Workspace is open) */}
      <div className="flex-1 flex min-h-0 w-full relative z-20 overflow-hidden">
        
        {/* Left Column: Chat History Sidebar (Slide-out panel / Sidebar) */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ x: -350, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -350, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-40 lg:relative lg:inset-auto w-full max-w-[320px] lg:max-w-none lg:w-[320px] xl:w-[350px] h-full flex-shrink-0 border-r border-cyan-500/10 bg-[#07090e]/98 backdrop-blur-3xl p-5 flex flex-col gap-4"
            >
              {/* Sidebar Header */}
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare size={16} className="text-cyan-400 animate-pulse" />
                  <span className="text-[11px] font-bold tracking-[0.2em] text-white/90 uppercase font-mono">
                    Histórico Neural
                  </span>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 hover:bg-white/5 rounded text-white/50 hover:text-white transition-colors cursor-pointer"
                  title="Fechar histórico"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Nova Conversa Button */}
              <button
                onClick={handleNewConversation}
                className="w-full bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 border border-cyan-500/20 rounded-xl py-3 px-4 text-xs font-bold tracking-wider font-mono transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.05)]"
              >
                <span>+ INICIAR NOVA CONVERSA</span>
              </button>

              {/* Search History */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filtrar canais..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl py-2 px-3 text-[11px] text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/30 transition-all"
                />
              </div>

              {/* Conversations List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {conversations
                  .filter(c => c.title.toLowerCase().includes(historySearch.toLowerCase()))
                  .map((conv) => {
                    const isActive = conv.id === activeConversationId;
                    return (
                      <div
                        key={conv.id}
                        className={`group relative flex items-center justify-between rounded-xl p-3 border transition-all ${
                          isActive
                            ? 'bg-cyan-500/5 border-cyan-500/30 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                            : 'bg-white/[0.01] border-white/5 text-white/70 hover:bg-white/[0.03] hover:border-white/10 hover:text-white'
                        }`}
                      >
                        <button
                          onClick={() => {
                            setActiveConversationId(conv.id);
                            jarvisSpeak(`Retomando canal: ${conv.title}.`);
                          }}
                          className="flex-1 text-left min-w-0 pr-2 cursor-pointer bg-transparent border-0"
                        >
                          <div className="text-xs font-medium truncate leading-normal">
                            {conv.title}
                          </div>
                          <div className="text-[9px] text-white/30 font-mono mt-1 flex items-center gap-1.5">
                            <span>{new Date(conv.createdAt).toLocaleDateString('pt-BR')}</span>
                            <span>•</span>
                            <span>{conv.messages.length} mensagens</span>
                          </div>
                        </button>

                        {/* Delete Button */}
                        {conversations.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteConversation(conv.id);
                            }}
                            className="p-1 text-white/30 hover:text-red-400 hover:bg-white/5 rounded transition-all cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100 bg-transparent border-0"
                            title="Excluir canal"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>

              {/* Sync Status Info */}
              <div className="border-t border-white/5 pt-3 text-[10px] text-white/40 font-mono leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-400/80">
                  <ShieldCheck size={11} />
                  <span>Memória Sincronizada</span>
                </div>
                <p className="text-[9px]">
                  Canais criptografados locais. J.A.R.V.I.S. tem acesso completo a esta memória.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Left/Center Column: Chat View */}
        <main className={`flex-1 flex flex-col min-h-0 relative px-4 md:px-6 mt-2 mb-4 transition-all duration-300 ${
          showWorkspace ? 'w-full lg:w-1/2' : 'w-full max-w-4xl mx-auto'
        }`}>
        
        {/* Scrollable conversation pane */}
        <div className={`flex-1 overflow-y-auto px-1 pr-3 custom-scrollbar ${
          chatHistory.length === 0 
            ? 'flex flex-col justify-center space-y-6' 
            : 'space-y-6'
        }`}>
          
          {chatHistory.length === 0 ? (
            /* Gemini-style Intro / Greeting Page */
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="my-auto flex flex-col items-center text-center max-w-2xl mx-auto w-full px-4"
            >
              {/* Central Micro Neural Node */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-cyan-400/20 rounded-full blur-[30px] animate-pulse" />
                <motion.div 
                  className="w-18 h-18 bg-black/60 border border-cyan-500/30 rounded-full flex items-center justify-center relative shadow-[0_0_25px_rgba(6,182,212,0.4)] overflow-hidden"
                  whileHover={{ scale: 1.10 }}
                  transition={{ duration: 0.3 }}
                >
                  <ColorOrb dimension="64px" active={isListening || isProcessing || isSpeaking} />
                </motion.div>
              </div>

              <h1 className="text-3xl md:text-4xl font-light tracking-tight text-white mb-2 font-sans">
                Olá, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 font-medium">Sir Henrique</span>
              </h1>
              <p className="text-white/40 text-xs md:text-sm tracking-widest uppercase mb-10 font-mono">
                Como posso auxiliar seu ecossistema hoje?
              </p>

              {/* Gemini-style Suggestion Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full text-left">
                {SUGGESTIONS.map((s, idx) => (
                  <motion.div
                    key={idx}
                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.04)", borderColor: "rgba(6, 182, 212, 0.3)" }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSendMessage(undefined, s.prompt)}
                    className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 cursor-pointer transition-all duration-300 relative overflow-hidden group shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-cyan-500/10 rounded-xl text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                        {s.icon}
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold tracking-wider text-white/80 group-hover:text-cyan-300 transition-colors uppercase">
                          {s.title}
                        </h3>
                        <p className="text-[11px] text-white/40 mt-1 line-clamp-2 leading-relaxed">
                          {s.description}
                        </p>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400">
                      <ChevronRight size={14} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ) : (
            /* Active Chat Conversation Stream */
            <div className="flex flex-col gap-8 py-4">
              {chatHistory.map((msg, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'jarvis' && (
                    <div className="w-9 h-9 rounded-full bg-cyan-500/5 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.15)] relative overflow-hidden">
                      <ColorOrb dimension="34px" active={isSpeaking && i === chatHistory.length - 1} />
                    </div>
                  )}

                  <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {msg.role === 'jarvis' && (
                      <span className="text-[10px] font-bold tracking-[0.2em] text-cyan-400/70 mb-1.5 uppercase font-mono">
                        J.A.R.V.I.S.
                      </span>
                    )}
                    
                    <div className={`${
                      msg.role === 'user' 
                        ? 'bg-white/[0.04] border border-white/5 rounded-3xl rounded-tr-sm px-5 py-3 text-white/90 text-sm shadow-md font-sans leading-relaxed flex flex-col gap-2' 
                        : 'text-white/95 text-base font-sans min-w-0'
                    }`}>
                      {msg.image && (
                        <div className="relative rounded-2xl overflow-hidden border border-cyan-500/20 max-w-sm">
                          <img src={msg.image} alt="Upload Óptico" referrerPolicy="no-referrer" className="w-full h-auto object-cover max-h-60" />
                        </div>
                      )}
                      {msg.role === 'user' ? (
                        msg.text
                      ) : (
                        <FormattedMessage text={msg.text} />
                      )}
                    </div>
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-9 h-9 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center flex-shrink-0 text-cyan-300 font-bold text-xs ring-1 ring-cyan-500/20">
                      H
                    </div>
                  )}
                </motion.div>
              ))}

              {isProcessing && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-4 justify-start"
                >
                  <div className="w-9 h-9 rounded-full bg-cyan-500/5 border border-cyan-500/20 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.15)] overflow-hidden">
                    <ColorOrb dimension="34px" active={true} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-bold tracking-[0.2em] text-cyan-400/50 uppercase">
                      Sincronizando
                    </span>
                    {/* Animated Waveform placeholder */}
                    <div className="flex items-center gap-1 py-1.5 px-4 bg-white/[0.02] border border-white/5 rounded-2xl">
                      <span className="w-1.5 h-3 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                      <span className="w-1.5 h-3 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                      <span className="w-1.5 h-3 bg-cyan-400 rounded-full animate-bounce" />
                      <span className="text-[10px] tracking-widest text-white/30 uppercase pl-2 animate-pulse font-mono">
                        Conectando com módulo cognitivo...
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
          
        </div>

        {/* Gemini-Style Capsule Prompt Input */}
        <div className="mt-4 w-full">
          <div className="relative max-w-3xl mx-auto">
            <form onSubmit={handleSendMessage} className="relative flex items-center">
              {/* Image Preview Overlay inside Input Area */}
              {selectedImage && (
                <div className="absolute -top-24 left-6 z-20 bg-black/90 border border-cyan-500/30 rounded-xl p-1.5 shadow-xl flex items-center gap-2">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-white/10">
                    <img src={selectedImage} alt="Anexo" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex flex-col gap-1 pr-2">
                    <span className="text-[9px] font-mono text-cyan-400">IMAGEM CARREGADA</span>
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        jarvisSpeak("Imagem removida, Sir.");
                      }}
                      className="text-[9px] font-semibold text-red-400 hover:text-red-300 text-left bg-transparent border-0 cursor-pointer"
                    >
                      Remover Anexo
                    </button>
                  </div>
                </div>
              )}

              <input 
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onPaste={handlePaste}
                placeholder="Pergunte ao J.A.R.V.I.S... (Cole imagens com Ctrl+V)"
                className="w-full bg-white/[0.02] backdrop-blur-3xl border border-white/10 rounded-full py-4 pl-6 pr-44 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/10 transition-all duration-300 shadow-2xl"
              />
              
              {/* Inside Input Action Buttons */}
              <div className="absolute right-2 flex items-center gap-1.5">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-white/40 hover:text-cyan-400 hover:bg-white/5 rounded-full transition-all flex items-center justify-center cursor-pointer"
                  title="Anexar Imagem Neural"
                >
                  <Paperclip size={16} />
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={toggleCamera}
                  className={`p-2 rounded-full transition-all flex items-center justify-center ${
                    showCamera 
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)] animate-pulse' 
                    : 'text-white/40 hover:text-cyan-400 hover:bg-white/5'
                  }`}
                  title="Ativar/Desativar Córtex Visual (Câmera)"
                >
                  <Camera size={16} />
                </motion.button>

                {chatHistory.length > 0 && (
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      updateActiveChatHistory([]);
                      jarvisSpeak("Memória deste canal limpa com sucesso, Sir Henrique.");
                    }}
                    className="p-2 text-white/40 hover:text-red-400 hover:bg-white/[0.03] rounded-full transition-all flex items-center justify-center cursor-pointer"
                    title="Limpar canal atual"
                  >
                    <Trash2 size={16} />
                  </motion.button>
                )}

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleVoiceCommand}
                  className={`p-2 rounded-full transition-all flex items-center justify-center ${
                    isListening 
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse' 
                    : 'text-white/40 hover:text-cyan-400 hover:bg-white/5'
                  }`}
                  title="Ativar comando por voz"
                >
                  {isListening ? <Mic size={16} /> : <MicOff size={16} />}
                </motion.button>
                
                <motion.button
                  type="submit"
                  disabled={(!userInput.trim() && !selectedImage) || isProcessing}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={`p-2 rounded-full transition-all flex items-center justify-center ${
                    (userInput.trim() || selectedImage) && !isProcessing
                    ? 'bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer' 
                    : 'text-white/20 cursor-not-allowed'
                  }`}
                >
                  <ChevronRight size={16} />
                </motion.button>
              </div>
            </form>
          </div>
        </div>

        {/* Floating High-tech Camera Viewport */}
        <AnimatePresence>
          {showCamera && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, x: -50 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.8, x: -50 }}
              className="fixed bottom-36 left-8 z-30 w-72 bg-[#07090e]/95 border border-cyan-500/30 rounded-3xl p-4 shadow-[0_0_40px_rgba(6,182,212,0.25)] backdrop-blur-3xl ring-1 ring-cyan-500/10 flex flex-col gap-3"
            >
              {/* Circular Hologram Viewport */}
              <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/60 border border-cyan-500/20 group">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                {/* Sci-fi HUD overlay */}
                <div className="absolute inset-0 border border-cyan-500/10 rounded-2xl pointer-events-none" />
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[9px] font-mono text-cyan-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>CÓRTEX VISUAL</span>
                </div>
                {/* Grid overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(18,180,180,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(18,180,180,0.05)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-mono text-white/50">MÓDULO ÓPTICO</span>
                  <button 
                    type="button"
                    onClick={() => setCameraActiveVision(prev => !prev)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono border transition-all ${
                      cameraActiveVision 
                        ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' 
                        : 'bg-white/[0.02] border-white/5 text-white/40 hover:text-white'
                    }`}
                    title="Tira fotos automaticamente a cada mensagem enviada"
                  >
                    {cameraActiveVision ? <Eye size={10} /> : <EyeOff size={10} />}
                    <span>{cameraActiveVision ? "OBS. ATIVA" : "OBS. MANUAL"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={triggerAnalyzeSnapshot}
                    className="py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                  >
                    <Camera size={13} />
                    <span>Analisar Frame</span>
                  </button>
                  <button
                    type="button"
                    onClick={toggleCamera}
                    className="py-2 bg-white/5 hover:bg-red-500/10 hover:text-red-400 border border-white/5 hover:border-red-500/20 text-white/60 text-xs rounded-xl flex items-center justify-center gap-1 transition-all"
                  >
                    <X size={13} />
                    <span>Desativar</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        </main>

        {/* Right Column: Stark Workspace Widget (Slide-out panel / Sidebar) */}
        <AnimatePresence>
          {showWorkspace && (
            <motion.div
              initial={{ x: 350, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 350, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 right-0 z-40 lg:relative lg:inset-auto w-full lg:w-1/2 h-full flex-shrink-0 border-l border-cyan-500/10 bg-[#07090e]/98 backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)]"
            >
              <StarkWorkspace 
                onClose={() => setShowWorkspace(false)} 
                activeTab={workspaceTab}
                onTabChange={setWorkspaceTab}
                news={news}
                isLoadingNews={isLoadingNews}
                onAskJarvisNews={handleAskJarvisNews}
                onAskJarvisProject={handleAskJarvisProject}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Bottom Command Dock - Interoperates cleanly with Jarvis speach synthesis */}
      <footer className="relative z-30 pb-6 pt-2 flex justify-center">
        <div className="bg-black/80 backdrop-blur-3xl border border-white/10 px-8 py-4 rounded-full flex items-center gap-8 shadow-[0_30px_80px_rgba(0,0,0,0.8)] ring-1 ring-white/5 transition-all hover:ring-white/10">
          <DockIcon 
            icon={isListening ? <Mic size={24} className="text-white" /> : <MicOff size={24} className="text-white/40" />} 
            active={isListening} 
            onClick={handleVoiceCommand} 
            highlighted 
            tooltip="Microfone" 
          />
          <DockIcon 
            icon={<MessageSquare size={20} />} 
            active={showHistory} 
            onClick={() => {
              setShowHistory(prev => {
                const next = !prev;
                if (next) {
                  jarvisSpeak("Visualizando histórico completo de mensagens do nosso canal neural, Sir Henrique.");
                } else {
                  jarvisSpeak("Histórico de mensagens minimizado.");
                }
                return next;
              });
            }} 
            tooltip="Histórico" 
          />
          <DockIcon 
            icon={<Globe size={20} />} 
            active={showWorkspace && workspaceTab === 'news'} 
            onClick={() => {
              setShowWorkspace(prev => {
                const next = !prev || workspaceTab !== 'news';
                if (next) {
                  setWorkspaceTab('news');
                  jarvisSpeak("Sir Henrique, abrindo o painel de Notícias integrado de estilo Google.");
                } else {
                  jarvisSpeak("Painel de Notícias ocultado.");
                }
                return next;
              });
            }} 
            tooltip="Notícias Google" 
          />
          <DockIcon 
            icon={<ListTodo size={20} />} 
            active={showWorkspace && workspaceTab === 'projects'} 
            onClick={() => {
              setShowWorkspace(prev => {
                const next = !prev || workspaceTab !== 'projects';
                if (next) {
                  setWorkspaceTab('projects');
                  jarvisSpeak("Sir Henrique, abrindo o painel exclusivo de Projetos e Diretrizes Stark.");
                } else {
                  jarvisSpeak("Painel de Projetos ocultado.");
                }
                return next;
              });
            }} 
            tooltip="Projetos Stark" 
          />
          <DockIcon 
            icon={<Smartphone size={20} />} 
            active={showInstallModal} 
            onClick={() => {
              setShowInstallModal(prev => {
                const next = !prev;
                if (next) {
                  jarvisSpeak("Sir Henrique, abrindo o painel de instalação móvel para baixar o aplicativo diretamente no seu celular.");
                }
                return next;
              });
            }} 
            tooltip="Baixar no Celular" 
          />
          <DockIcon 
            icon={<Settings size={20} />} 
            active={showSettings} 
            onClick={() => {
              setShowSettings(prev => !prev);
              jarvisSpeak("Painel de configurações neurais ativado, Sir Henrique.");
            }} 
            tooltip="Configurações de Voz e IA" 
          />
        </div>
      </footer>

      {/* Settings Modal Layer */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-md bg-[#07090e]/95 border border-cyan-500/20 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.15)] backdrop-blur-2xl flex flex-col gap-5 overflow-hidden ring-1 ring-cyan-500/10 z-50 text-white"
            >
              <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Title Header */}
              <div className="flex items-center gap-3">
                <ColorOrb dimension="28px" active={true} />
                <div>
                  <h2 className="text-sm font-semibold tracking-widest text-cyan-400 font-mono uppercase">
                    Configurações do J.A.R.V.I.S.
                  </h2>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                    Ajustes de Cognição e Síntese de Voz
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="h-[1px] bg-cyan-500/10 w-full" />

              {/* Settings Fields Container */}
              <div className="space-y-4 text-sm max-h-[350px] overflow-y-auto pr-1">
                
                {/* 1. Cognitive Brain Selector (Groq vs Gemini) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase font-mono block">
                    Cérebro Heurístico (Processar)
                  </label>
                  <p className="text-[10.5px] text-white/50 leading-relaxed font-sans">
                    O canal recomendado é o Groq pela resposta instantânea de baixa latência. O Gemini é acionado quando pesquisas online são exigidas.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => handleSavePrimaryEngine('groq')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        primaryEngine === 'groq'
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                          : 'bg-white/[0.01] border-white/5 hover:border-white/10 text-white/40'
                      }`}
                    >
                      <span className="font-bold">Groq</span>
                      <span className="text-[8.5px] font-mono text-white/30 lowercase italic font-normal">resposta instantânea</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSavePrimaryEngine('gemini')}
                      className={`px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        primaryEngine === 'gemini'
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                          : 'bg-white/[0.01] border-white/5 hover:border-white/10 text-white/40'
                      }`}
                    >
                      <span className="font-bold">Gemini 3.5</span>
                      <span className="text-[8.5px] font-mono text-white/30 lowercase italic font-normal">completo + web search</span>
                    </button>
                  </div>
                </div>

                {/* Groq Model selection */}
                {primaryEngine === 'groq' && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="text-[10px] font-bold tracking-widest text-white/50 uppercase font-mono block">
                      Modelo do Canal Groq
                    </label>
                    <select
                      value={groqModel}
                      onChange={(e) => handleSaveGroqModel(e.target.value)}
                      className="w-full bg-black/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-cyan-500/30 font-mono tracking-wide cursor-pointer"
                    >
                      <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Qualidade)</option>
                      <option value="llama3-8b-8192">llama3-8b-8192 (Ultra Rápido)</option>
                      <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (Balanceado)</option>
                    </select>
                  </div>
                )}

                <div className="h-[1px] bg-white/5 w-full my-1" />

                {/* 2. Synthesis Voice Type Selection */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase font-mono block">
                    Gerador de Voz (Fidelidade)
                  </label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => handleSaveUseLocal(true)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        useLocalAlways
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                          : 'bg-white/[0.01] border-white/5 hover:border-white/10 text-white/40'
                      }`}
                    >
                      <span className="font-bold">Voz Local</span>
                      <span className="text-[8.5px] text-white/30 lowercase italic font-normal">Navegador (Livre)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveUseLocal(false)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                        !useLocalAlways
                          ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                          : 'bg-white/[0.01] border-white/5 hover:border-white/10 text-white/40'
                      }`}
                    >
                      <span className="font-bold">Voz Neural</span>
                      <span className="text-[8.5px] text-white/30 lowercase italic font-normal">Gemini TTS (Charon)</span>
                    </button>
                  </div>
                </div>

                {/* 3. SpeechSynthesis API Voice choices */}
                {useLocalAlways && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="text-[10px] font-bold tracking-widest text-white/50 uppercase font-mono block animate-pulse">
                      Escolher Voz do Navegador
                    </label>
                    {availableVoices.length > 0 ? (
                      <select
                        value={selectedVoiceName}
                        onChange={(e) => handleSaveVoiceName(e.target.value)}
                        className="w-full bg-black/90 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-cyan-500/30 cursor-pointer"
                      >
                        <option value="">Padrão do Sistema Operacional</option>
                        {[...availableVoices]
                          .sort((a, b) => {
                            const aIsPt = a.lang.startsWith('pt');
                            const bIsPt = b.lang.startsWith('pt');
                            if (aIsPt && !bIsPt) return -1;
                            if (!aIsPt && bIsPt) return 1;
                            return a.name.localeCompare(b.name);
                          })
                          .map((voice, idx) => (
                            <option key={idx} value={voice.name} className="bg-[#07090e]">
                              {voice.lang.startsWith('pt') ? `🇧🇷 [PT] ` : `🌐 `} {voice.name} ({voice.lang})
                            </option>
                          ))
                        }
                      </select>
                    ) : (
                      <div className="text-[10px] text-white/30 italic">
                        Carregando vozes do sistema operacional...
                      </div>
                    )}
                  </div>
                )}

                {/* 4. Speed Rate Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold tracking-widest text-white/50 uppercase font-mono block">
                      Velocidade da Fala (Rate)
                    </label>
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-1.5 rounded">
                      {speechRate.toFixed(2)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={speechRate}
                    onChange={(e) => handleSaveSpeechRate(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 accent-cyan-400 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-white/20 font-mono">
                    <span>Lento</span>
                    <span>Padrão (1.0)</span>
                    <span>Rápido</span>
                  </div>
                </div>

                {/* 5. Pitch Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold tracking-widest text-white/50 uppercase font-mono block">
                      Tom de Voz (Pitch)
                    </label>
                    <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 px-1.5 rounded">
                      {speechPitch.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.05"
                    value={speechPitch}
                    onChange={(e) => handleSaveSpeechPitch(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 accent-cyan-400 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-white/20 font-mono">
                    <span>Grave (Stark)</span>
                    <span>Padrão (1.0)</span>
                    <span>Agudo</span>
                  </div>
                </div>

                <div className="h-[1px] bg-white/5 w-full my-1" />

                {/* 6. Custom API Keys Section */}
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase font-mono block">
                    Chaves de API Pessoais
                  </label>
                  <p className="text-[10px] text-white/40 leading-relaxed font-sans">
                    Insira suas próprias chaves de API para rodar o J.A.R.V.I.S diretamente no GitHub ou na Vercel de forma 100% estática e segura. Elas ficam salvas apenas no seu navegador.
                  </p>
                  
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-white/50 block">Chave Gemini API (Google)</span>
                      <input
                        type="password"
                        placeholder="Insira a chave Gemini (AI Studio)..."
                        value={customGeminiKey}
                        onChange={(e) => handleSaveCustomGeminiKey(e.target.value)}
                        className="w-full bg-black/95 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-cyan-500/30 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-white/50 block">Chave Groq API (Llama-3)</span>
                      <input
                        type="password"
                        placeholder="Insira a chave Groq..."
                        value={customGroqKey}
                        onChange={(e) => handleSaveCustomGroqKey(e.target.value)}
                        className="w-full bg-black/95 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/80 focus:outline-none focus:border-cyan-500/30 font-mono"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Divider */}
              <div className="h-[1px] bg-cyan-500/10 w-full" />

              {/* Footer Actions: Test & Close */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    const testMessage = "Ajustes de voz aplicados com sucesso, Sir Henrique. Conexão neural estabilizada.";
                    setIsSpeaking(true);
                    await jarvisSpeak(testMessage);
                    setIsSpeaking(false);
                  }}
                  className="flex-1 px-4 py-2.5 bg-white/[0.02] border border-white/5 hover:border-cyan-500/20 rounded-xl text-xs font-bold tracking-widest text-white hover:text-cyan-300 transition-all font-mono uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Volume2 size={12} />
                  Testar Voz
                </button>

                <button
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 border border-cyan-500 text-black rounded-xl text-xs font-bold tracking-widest transition-all font-mono uppercase cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                >
                  Confirmar
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PWA / Mobile Download Modal Layer */}
      <AnimatePresence>
        {showInstallModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowInstallModal(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-lg bg-[#07090e]/95 border border-cyan-500/20 rounded-2xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.15)] backdrop-blur-2xl flex flex-col gap-5 overflow-hidden ring-1 ring-cyan-500/10 z-50 text-white"
            >
              <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={() => setShowInstallModal(false)}
                  className="text-white/40 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Title Header */}
              <div className="flex items-center gap-3">
                <div className="w-[36px] h-[36px] bg-cyan-500/10 rounded-xl border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold tracking-widest text-cyan-400 font-mono uppercase">
                    Instalar J.A.R.V.I.S. no Celular
                  </h2>
                  <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold">
                    Acesso Direto, Tela Cheia & Modo Offline
                  </p>
                </div>
              </div>

              {/* Grid Content */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 py-2 items-center">
                {/* QR Code Column */}
                <div className="md:col-span-5 flex flex-col items-center justify-center bg-black/40 border border-white/5 rounded-2xl p-4 gap-2 text-center">
                  <span className="text-[9px] font-mono text-cyan-400/80 uppercase tracking-wider">Aponte a Câmera</span>
                  <div className="relative p-2 bg-white/5 rounded-xl border border-white/10 overflow-hidden group">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&color=06b6d4&bgcolor=0a0f1d&data=${encodeURIComponent(window.location.href)}`}
                      alt="QR Code J.A.R.V.I.S."
                      className="w-[140px] h-[140px] md:w-[150px] md:h-[150px] rounded"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 border border-cyan-500/20 rounded-xl pointer-events-none" />
                  </div>
                  <p className="text-[9px] text-white/40 font-sans max-w-[140px] leading-relaxed">
                    Escaneie para abrir no celular instantaneamente.
                  </p>
                </div>

                {/* Instructions Column */}
                <div className="md:col-span-7 space-y-3.5">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold tracking-widest text-cyan-400 uppercase font-mono block">Instruções de Instalação</span>
                    <p className="text-[11px] text-white/50 leading-relaxed font-sans">
                      Adicione à tela inicial do seu celular para obter a experiência nativa sem barra de navegação:
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* iOS */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex gap-3">
                      <div className="text-[11px] font-mono font-bold bg-cyan-500/10 text-cyan-400 w-5 h-5 rounded-full flex items-center justify-center shrink-0">iOS</div>
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-white/80 block">No iPhone (Safari):</span>
                        <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                          Clique em <span className="text-cyan-400">"Compartilhar"</span> (ícone de enviar) e depois selecione <span className="text-cyan-400">"Adicionar à Tela de Início"</span>.
                        </p>
                      </div>
                    </div>

                    {/* Android */}
                    <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex gap-3">
                      <div className="text-[11px] font-mono font-bold bg-cyan-500/10 text-cyan-400 w-5 h-5 rounded-full flex items-center justify-center shrink-0">And</div>
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-white/80 block">No Android (Chrome):</span>
                        <p className="text-[10px] text-white/50 leading-relaxed font-sans">
                          Clique nos <span className="text-cyan-400">três pontos</span> no canto superior e selecione <span className="text-cyan-400">"Adicionar à tela inicial"</span> ou <span className="text-cyan-400">"Instalar aplicativo"</span>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info Text */}
              <p className="text-[10px] text-white/40 leading-relaxed font-sans bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2.5">
                ⚡ <span className="text-white/60 font-semibold">Tecnologia PWA Ativada:</span> O J.A.R.V.I.S. salva automaticamente arquivos essenciais em cache para funcionamento offline e inicialização super veloz no seu smartphone.
              </p>

              {/* Divider */}
              <div className="h-[1px] bg-cyan-500/10 w-full" />

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowInstallModal(false)}
                  className="flex-1 px-4 py-2.5 bg-white/[0.02] border border-white/5 hover:border-white/10 rounded-xl text-xs font-bold tracking-widest text-white/70 hover:text-white transition-all font-mono uppercase cursor-pointer"
                >
                  Voltar
                </button>

                {deferredPrompt ? (
                  <button
                    type="button"
                    onClick={handleInstallApp}
                    className="flex-1 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 border border-cyan-500 text-black rounded-xl text-xs font-bold tracking-widest transition-all font-mono uppercase cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] flex items-center justify-center gap-1.5"
                  >
                    <Download size={13} />
                    Instalar Agora
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      jarvisSpeak("Sir Henrique, por favor siga o tutorial acima para adicionar o J.A.R.V.I.S. à tela inicial do seu celular manualmente.");
                    }}
                    className="flex-1 px-5 py-2.5 bg-white/[0.04] border border-white/10 text-cyan-400 rounded-xl text-xs font-bold tracking-widest transition-all font-mono uppercase cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    Suporte Pronto ✓
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Subtle CRT Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.02)_50%)] bg-[length:100%_4px] opacity-10" />
      <div className="fixed inset-0 pointer-events-none z-50 bg-radial-[transparent,rgba(0,0,0,0.3)]" />
    </div>
  );
}

function DockIcon({ icon, active, onClick, highlighted, tooltip }: { icon: React.ReactNode, active: boolean, onClick: () => void, highlighted?: boolean, tooltip: string }) {
  return (
    <motion.button
      whileHover={{ scale: 1.15, y: -4 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="relative group transition-all duration-300 flex items-center justify-center cursor-pointer"
      title={tooltip}
    >
      <div className={`${active ? 'text-cyan-400' : 'text-white/40'} group-hover:text-cyan-300 transition-colors`}>
        {icon}
      </div>
      {active && (
        <motion.div 
          layoutId="dock-dot"
          className="absolute -bottom-2 w-1 h-1 bg-cyan-400 rounded-full"
        />
      )}
      {highlighted && (
        <div className="absolute inset-0 bg-white/5 blur-xl rounded-full -z-10 group-hover:bg-white/10 transition-all" />
      )}
    </motion.button>
  );
}

// --- Companion Sub-components for Gemini-style Rich Message Format -----

function FormattedMessage({ text }: { text: string }) {
  // Parses markdown style spacing, bold, and bullet points safely in React
  const blocks = text.split('\n\n');
  return (
    <div className="space-y-4 font-sans text-[14px] md:text-[15px] leading-relaxed text-white/90">
      {blocks.map((block, idx) => {
        const trimmed = block.trim();
        // Bullet list support
        if (trimmed.startsWith('*') || trimmed.startsWith('-')) {
          const items = block.split('\n').map(line => line.trim().replace(/^[\*\-]\s*/, ''));
          return (
            <ul key={idx} className="list-disc pl-5 space-y-2 text-white/80">
              {items.map((item, i) => (
                <li key={i}>{renderFormattedLine(item)}</li>
              ))}
            </ul>
          );
        }
        
        // standard paragraph
        return (
          <p key={idx}>
            {block.split('\n').map((line, lIdx) => (
              <React.Fragment key={lIdx}>
                {lIdx > 0 && <br />}
                {renderFormattedLine(line)}
              </React.Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}

function renderFormattedLine(line: string) {
  // Parses markdown bold (**text**) and markdown links ([text](url)) safely
  const regex = /(\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)]+)\))/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.substring(lastIndex, match.index));
    }

    if (match[2]) {
      // Bold matches
      parts.push(
        <strong key={match.index} className="text-cyan-300 font-semibold drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">
          {match[2]}
        </strong>
      );
    } else if (match[3] && match[4]) {
      // Link matches
      const title = match[3];
      const url = match[4];
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-cyan-400 hover:text-cyan-300 underline font-semibold transition-colors duration-200 inline-flex items-center gap-0.5"
        >
          {title}
          <span className="text-[10px] opacity-70">↗</span>
        </a>
      );
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(line.substring(lastIndex));
  }

  return parts.length > 0 ? parts : line;
}

const SUGGESTIONS = [
  {
    title: "Análise Heurística",
    description: "Verificar integridade geral dos núcleos cognitivos e das conexões neurais do sistema.",
    prompt: "Jarvis, faça uma análise da integridade dos seus sistemas cognitivos.",
    icon: <ShieldCheck size={16} />
  },
  {
    title: "Orientação e Produtividade",
    description: "Diretrizes heurísticas avançadas de alta performance para gerenciar o foco diário.",
    prompt: "Jarvis, me dê algumas orientações heurísticas para maximizar minha produtividade diária.",
    icon: <Cpu size={16} />
  },
  {
    title: "Estratégia de Vendas",
    description: "Criar estruturas de funis de inteligência para decolar venda de softwares.",
    prompt: "Jarvis, quais os principais canais de funis para escala de venda de software SaaS?",
    icon: <Zap size={16} />
  },
  {
    title: "Estrutura de IA",
    description: "Planejar ou refinar scripts em Python para nosso núcleo cognitivo.",
    prompt: "Como estruturar um script Python robusto para expandir minha inteligência artificial?",
    icon: <Atom size={16} />
  }
];


