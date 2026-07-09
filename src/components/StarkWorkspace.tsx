import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Timer, 
  Bell, 
  BookOpen, 
  Plus, 
  Trash2, 
  Play, 
  Pause, 
  RotateCcw, 
  Check, 
  Download, 
  Sparkles, 
  AlertTriangle, 
  ChevronRight,
  ListTodo,
  TrendingUp,
  X,
  DollarSign,
  Wallet,
  CreditCard,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  RefreshCw,
  TrendingDown,
  Edit2,
  FileText,
  Volume2,
  Globe,
  Newspaper
} from 'lucide-react';
import { 
  generateStarkWorkspaceContent, 
  jarvisSpeak, 
  GenerationResult, 
  GeneratedQuestion, 
  GeneratedTaskItem 
} from '../lib/gemini';
import { 
  auth
} from '../lib/firebase';
import { 
  getTransactions, 
  addTransaction, 
  deleteTransaction, 
  updateTransaction,
  getGoals, 
  saveGoal, 
  deleteGoal, 
  FinancialTransaction, 
  FinancialGoal 
} from '../lib/financeService';

interface StarkEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  type: 'Reunião' | 'Compromisso' | 'Estudo' | 'Pessoal';
  description?: string;
}

interface StarkAlarm {
  id: string;
  time: string; // HH:MM
  label: string;
  active: boolean;
}

interface StarkProject {
  id: string;
  name: string;
  category: 'andamento' | 'planejamento' | 'concluido' | 'pausa';
  description: string;
  objectives: string;
  resources: string;
  deadline: string;
  progress: string;
  updates: { id: string; date: string; text: string }[];
}

interface StarkTimeline {
  id: string;
  title: string;
  targetDate: string;
  tasks: { id: string; text: string; done: boolean }[];
}

export default function StarkWorkspace({ 
  onClose,
  activeTab: controlledTab,
  onTabChange,
  news = [],
  isLoadingNews = false,
  onAskJarvisNews,
  onAskJarvisProject
}: { 
  onClose: () => void;
  activeTab?: 'calendar' | 'time' | 'generator' | 'finance' | 'news' | 'projects';
  onTabChange?: (tab: 'calendar' | 'time' | 'generator' | 'finance' | 'news' | 'projects') => void;
  news?: any[];
  isLoadingNews?: boolean;
  onAskJarvisNews?: (title: string, source: string) => void;
  onAskJarvisProject?: (project: StarkProject) => void;
}) {
  const [localActiveTab, setLocalActiveTab] = useState<'calendar' | 'time' | 'generator' | 'finance' | 'news' | 'projects'>('calendar');
  const [newsCategoryFilter, setNewsCategoryFilter] = useState('Todos');
  const activeTab = controlledTab !== undefined ? controlledTab : localActiveTab;
  const setActiveTab = onTabChange || setLocalActiveTab;
  
  // ----------------------------------------------------
  // GOOGLE CALENDAR & FIREBASE AUTH & FINANCE STATE
  // ----------------------------------------------------
  const [googleUser, setGoogleUser] = useState<any>({ uid: 'demo_user', displayName: 'Henrique (Stark Local)' });
  const [googleEvents] = useState<any[]>([]);
  const [isSyncingCalendar] = useState(false);
  const [needsAuth, setNeedsAuth] = useState(false);
  
  // Finance states
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isFinancesLoading, setIsFinancesLoading] = useState(false);
  
  // New transaction inputs
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [txDesc, setTxDesc] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txCategory, setTxCategory] = useState('Outros');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);

  // New Goal inputs
  const [showAddGoalModal, setShowAddGoalModal] = useState(false);
  const [goalTitleInput, setGoalTitleInput] = useState('');
  const [goalTargetInput, setGoalTargetInput] = useState('');
  const [goalCurrentInput, setGoalCurrentInput] = useState('0');
  const [goalDeadline, setGoalDeadline] = useState('');

  // Finance Sub-tab & Editing States
  const [financeSubTab, setFinanceSubTab] = useState<'dashboard' | 'report' | 'goals'>('dashboard');
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [editTxDesc, setEditTxDesc] = useState('');
  const [editTxAmount, setEditTxAmount] = useState('');
  const [editTxType, setEditTxType] = useState<'income' | 'expense'>('expense');
  const [editTxCategory, setEditTxCategory] = useState('Outros');
  const [editTxDate, setEditTxDate] = useState('');

  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalTitle, setEditGoalTitle] = useState('');
  const [editGoalTarget, setEditGoalTarget] = useState('');
  const [editGoalCurrent, setEditGoalCurrent] = useState('');

  // CALENDÁRIO & COMPROMISSOS & CRONOGRAMAS STATE
  // ----------------------------------------------------
  const [events, setEvents] = useState<StarkEvent[]>(() => {
    const saved = localStorage.getItem('stark_events');
    return saved ? JSON.parse(saved) : [
      { id: '1', title: 'Revisão Neuronal com J.A.R.V.I.S.', date: new Date().toISOString().split('T')[0], time: '14:30', type: 'Estudo', description: 'Otimizar o fluxo de síntese de voz e analisar logs.' },
      { id: '2', title: 'Alinhamento Zorin OS', date: new Date().toISOString().split('T')[0], time: '18:00', type: 'Reunião', description: 'Sincronizar bibliotecas do sistema operacional.' }
    ];
  });
  
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDate, setNewEventDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newEventTime, setNewEventTime] = useState('10:00');
  const [newEventType, setNewEventType] = useState<'Reunião' | 'Compromisso' | 'Estudo' | 'Pessoal'>('Estudo');
  const [newEventDesc, setNewEventDesc] = useState('');

  // Cronogramas / Timelines
  const [timelines, setTimelines] = useState<StarkTimeline[]>(() => {
    const saved = localStorage.getItem('stark_timelines');
    return saved ? JSON.parse(saved) : [
      {
        id: 'tl1',
        title: 'Domínio de Redes Neurais',
        targetDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tasks: [
          { id: 't1', text: 'Entender arquiteturas de transformers', done: true },
          { id: 't2', text: 'Estudar parâmetros de temperatura e topP', done: false },
          { id: 't3', text: 'Fazer o simulado final gerado por voz', done: false }
        ]
      }
    ];
  });
  const [newTimelineTitle, setNewTimelineTitle] = useState('');
  const [newTimelineDate, setNewTimelineDate] = useState('');
  const [newTimelineTaskText, setNewTimelineTaskText] = useState<{ [key: string]: string }>({});

  // ----------------------------------------------------
  // STOPWATCH / CRONÔMETRO STATE
  // ----------------------------------------------------
  const [stopwatchTime, setStopwatchTime] = useState(0); // in deciseconds (100ms units)
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [laps, setLaps] = useState<number[]>([]);
  const stopwatchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ----------------------------------------------------
  // ALARMES STATE
  // ----------------------------------------------------
  const [alarms, setAlarms] = useState<StarkAlarm[]>(() => {
    const saved = localStorage.getItem('stark_alarms');
    return saved ? JSON.parse(saved) : [
      { id: 'al1', time: '08:00', label: 'Acordar / Protocolo Inicial', active: false },
      { id: 'al2', time: '22:00', label: 'Fechamento de Ciclo Diário', active: false }
    ];
  });
  const [newAlarmTime, setNewAlarmTime] = useState('07:00');
  const [newAlarmLabel, setNewAlarmLabel] = useState('Novo Alerta Stark');
  const [activeAlarmAlert, setActiveAlarmAlert] = useState<StarkAlarm | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const alarmBeeperRef = useRef<NodeJS.Timeout | null>(null);

  // ----------------------------------------------------
  // PROJETOS STATE
  // ----------------------------------------------------
  const [projects, setProjects] = useState<StarkProject[]>(() => {
    const saved = localStorage.getItem('stark_projects');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'proj1',
        name: 'Assistente Neural J.A.R.V.I.S.',
        category: 'andamento',
        description: 'Desenvolvimento e refinamento contínuo dos córtexes cognitivo, visual e de voz do J.A.R.V.I.S. para servir como o centro de comando definitivo.',
        objectives: 'Alcançar latência ultra-baixa em respostas por voz, integrar automações com Google Cloud, e refinar percepção do córtex óptico.',
        resources: 'React 18, Vite, Tailwind CSS, API do Gemini, Firebase, Groq API, Lucide Icons.',
        deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progress: 'Córtex visual e financeiro estabilizados com banco de dados na nuvem. Síntese de voz neural ativa.',
        updates: [
          { id: 'up1', date: '2026-07-06', text: 'Sincronização com Firestore e Google Agenda concluída.' },
          { id: 'up2', date: '2026-07-09', text: 'Desenvolvimento do novo painel de controle de projetos iniciado.' }
        ]
      },
      {
        id: 'proj2',
        name: 'Metas Patrimoniais de Longo Prazo',
        category: 'planejamento',
        description: 'Planejar a alocação de ativos e investimentos baseados nas diretrizes do CFO J.A.R.V.I.S. para criação rápida de riqueza.',
        objectives: 'Estabelecer uma taxa de economia constante acima de 20%, criar um fundo de liquidez de 6 meses e parametrizar metas no Firestore.',
        resources: 'Finance Tracker do J.A.R.V.I.S., Planilhas Financeiras, Plataforma de Investimentos.',
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        progress: 'Em fase de estruturação e diagnóstico financeiro de entradas e saídas.',
        updates: []
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('stark_projects', JSON.stringify(projects));
  }, [projects]);

  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState<'andamento' | 'planejamento' | 'concluido' | 'pausa'>('andamento');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectObjectives, setNewProjectObjectives] = useState('');
  const [newProjectResources, setNewProjectResources] = useState('');
  const [newProjectDeadline, setNewProjectDeadline] = useState('');
  const [newProjectProgress, setNewProjectProgress] = useState('');

  const [projectFilter, setProjectFilter] = useState<'Todos' | 'andamento' | 'planejamento' | 'concluido' | 'pausa'>('Todos');
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  
  const [editProjectName, setEditProjectName] = useState('');
  const [editProjectCategory, setEditProjectCategory] = useState<'andamento' | 'planejamento' | 'concluido' | 'pausa'>('andamento');
  const [editProjectDescription, setEditProjectDescription] = useState('');
  const [editProjectObjectives, setEditProjectObjectives] = useState('');
  const [editProjectResources, setEditProjectResources] = useState('');
  const [editProjectDeadline, setEditProjectDeadline] = useState('');
  const [editProjectProgress, setEditProjectProgress] = useState('');

  const [newUpdateText, setNewUpdateText] = useState<{ [projectId: string]: string }>({});
  const [expandedProjects, setExpandedProjects] = useState<{ [id: string]: boolean }>({ 'proj1': true });

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    const newProj: StarkProject = {
      id: 'proj_' + Date.now(),
      name: newProjectName,
      category: newProjectCategory,
      description: newProjectDescription,
      objectives: newProjectObjectives,
      resources: newProjectResources,
      deadline: newProjectDeadline || new Date().toISOString().split('T')[0],
      progress: newProjectProgress || 'Iniciado recentemente.',
      updates: []
    };
    setProjects(prev => [newProj, ...prev]);
    // Reset fields
    setNewProjectName('');
    setNewProjectCategory('andamento');
    setNewProjectDescription('');
    setNewProjectObjectives('');
    setNewProjectResources('');
    setNewProjectDeadline('');
    setNewProjectProgress('');
    setShowAddProject(false);
  };

  const handleStartEditProject = (p: StarkProject) => {
    setEditingProjectId(p.id);
    setEditProjectName(p.name);
    setEditProjectCategory(p.category);
    setEditProjectDescription(p.description);
    setEditProjectObjectives(p.objectives);
    setEditProjectResources(p.resources);
    setEditProjectDeadline(p.deadline);
    setEditProjectProgress(p.progress);
  };

  const handleSaveEditProject = (id: string) => {
    setProjects(prev => prev.map(p => p.id === id ? {
      ...p,
      name: editProjectName,
      category: editProjectCategory,
      description: editProjectDescription,
      objectives: editProjectObjectives,
      resources: editProjectResources,
      deadline: editProjectDeadline,
      progress: editProjectProgress
    } : p));
    setEditingProjectId(null);
  };

  const handleAddProjectUpdate = (projectId: string) => {
    const text = newUpdateText[projectId] || '';
    if (!text.trim()) return;
    const newLog = {
      id: 'up_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      text: text.trim()
    };
    setProjects(prev => prev.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          updates: [newLog, ...p.updates]
        };
      }
      return p;
    }));
    setNewUpdateText(prev => ({ ...prev, [projectId]: '' }));
  };

  const handleDeleteProject = (id: string) => {
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const toggleProjectExpand = (id: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // ----------------------------------------------------
  // SIMULADOS / TAREFAS AI GENERATOR STATE
  // ----------------------------------------------------
  const [topicInput, setTopicInput] = useState('');
  const [generationType, setGenerationType] = useState<'simulado' | 'tarefa'>('simulado');
  const [questionsCount, setQuestionsCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GenerationResult | null>(() => {
    const saved = localStorage.getItem('stark_generated_content');
    return saved ? JSON.parse(saved) : null;
  });
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: number }>({});
  const [showResults, setShowResults] = useState(false);

  // Persistent storage updates
  useEffect(() => {
    localStorage.setItem('stark_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('stark_timelines', JSON.stringify(timelines));
  }, [timelines]);

  useEffect(() => {
    localStorage.setItem('stark_alarms', JSON.stringify(alarms));
  }, [alarms]);

  useEffect(() => {
    if (generatedContent) {
      localStorage.setItem('stark_generated_content', JSON.stringify(generatedContent));
    } else {
      localStorage.removeItem('stark_generated_content');
    }
  }, [generatedContent]);

  // Sincronização em tempo real de ações executadas de forma autônoma pelo J.A.R.V.I.S
  const fetchFinanceAndCalendar = async (user: any) => {
    setIsFinancesLoading(true);
    try {
      const uid = user?.uid || 'demo_user';
      const txs = await getTransactions(uid);
      setTransactions(txs);
      
      const gls = await getGoals(uid);
      setGoals(gls);
    } catch (e) {
      console.error("Local finance loading error:", e);
    } finally {
      setIsFinancesLoading(false);
    }
  };

  useEffect(() => {
    const handleExternalUpdate = () => {
      const savedEvents = localStorage.getItem('stark_events');
      if (savedEvents) setEvents(JSON.parse(savedEvents));

      const savedTimelines = localStorage.getItem('stark_timelines');
      if (savedTimelines) setTimelines(JSON.parse(savedTimelines));

      const savedAlarms = localStorage.getItem('stark_alarms');
      if (savedAlarms) setAlarms(JSON.parse(savedAlarms));

      const savedProjects = localStorage.getItem('stark_projects');
      if (savedProjects) setProjects(JSON.parse(savedProjects));

      const savedGeneratedContent = localStorage.getItem('stark_generated_content');
      if (savedGeneratedContent) {
        setGeneratedContent(JSON.parse(savedGeneratedContent));
      } else {
        setGeneratedContent(null);
      }

      // Troca automática de abas se requisitado pelo J.A.R.V.I.S
      const requestedTab = localStorage.getItem('stark_requested_tab');
      if (requestedTab === 'calendar' || requestedTab === 'time' || requestedTab === 'generator' || requestedTab === 'finance' || requestedTab === 'news' || requestedTab === 'projects') {
        setActiveTab(requestedTab as any);
        localStorage.removeItem('stark_requested_tab');
      }

      if (auth.currentUser) {
        fetchFinanceAndCalendar(auth.currentUser);
      }
    };

    window.addEventListener('stark_workspace_update', handleExternalUpdate);
    return () => {
      window.removeEventListener('stark_workspace_update', handleExternalUpdate);
    };
  }, []);

  useEffect(() => {
    fetchFinanceAndCalendar({ uid: 'demo_user' });
  }, []);

  const handleGoogleSignIn = async () => {
    jarvisSpeak("Modo local ativo, Sir Henrique. Não há necessidade de sincronização em nuvem.");
  };

  const handleLogout = async () => {
    jarvisSpeak("Não é possível fechar sessão em modo local restrito, Sir Henrique.");
  };

  // Suporte para o J.A.R.V.I.S disparar a geração de simulados ou tarefas de forma autônoma
  useEffect(() => {
    const handleAutoGenerate = async (e: Event) => {
      const customEvent = e as CustomEvent<{ topic: string, type: 'simulado' | 'tarefa', count?: number }>;
      const { topic, type, count } = customEvent.detail;
      if (!topic) return;

      setTopicInput(topic);
      setGenerationType(type);
      if (count) setQuestionsCount(count);

      setIsGenerating(true);
      setGeneratedContent(null);
      setUserAnswers({});
      setShowResults(false);
      
      try {
        const result = await generateStarkWorkspaceContent(topic, type, count || 5);
        setGeneratedContent(result);
        jarvisSpeak(`Material pedagógico sobre ${topic} concluído e carregado no seu painel Stark, Sir.`);
      } catch (err) {
        console.error(err);
      } finally {
        setIsGenerating(false);
      }
    };

    window.addEventListener('stark_workspace_auto_generate', handleAutoGenerate as EventListener);
    return () => {
      window.removeEventListener('stark_workspace_auto_generate', handleAutoGenerate as EventListener);
    };
  }, []);

  // ----------------------------------------------------
  // SYSTEM ALARM CLOCK TICKER
  // ----------------------------------------------------
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentHHMM = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const currentSec = now.getSeconds();

      // Only trigger alarms exactly at second 0 to avoid duplicates
      if (currentSec === 0) {
        // 1. Check Alarms
        const triggered = alarms.find(a => a.active && a.time === currentHHMM);
        if (triggered) {
          triggerAlarmAlert(triggered);
        }

        // 2. Check Calendar Events for "Today" (Lembrete do Dia)
        const todayDateStr = now.toISOString().split('T')[0];
        const matchEvent = events.find(e => e.date === todayDateStr && e.time === currentHHMM);
        if (matchEvent) {
          jarvisSpeak(`Alerta de compromisso, Senhor Henrique: ${matchEvent.title} marcado para agora.`);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [alarms, events]);

  // Audio synthesize trigger for Alarm Alert
  const triggerAlarmAlert = (alarm: StarkAlarm) => {
    setActiveAlarmAlert(alarm);
    jarvisSpeak(`Atenção, Senhor Henrique. O alarme "${alarm.label || 'Stark'}" está disparando agora.`);

    // Start synthesizing alarm beeps
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      audioContextRef.current = ctx;

      let beepCount = 0;
      alarmBeeperRef.current = setInterval(() => {
        if (beepCount > 60 || ctx.state === 'closed') {
          stopAlarmAudio();
          return;
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // high pure sci-fi notification tone (A5)
        
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        beepCount++;
      }, 700);

    } catch (e) {
      console.warn("Could not initiate synthesized alarm beep:", e);
    }
  };

  const stopAlarmAudio = () => {
    if (alarmBeeperRef.current) {
      clearInterval(alarmBeeperRef.current);
      alarmBeeperRef.current = null;
    }
    if (audioContextRef.current) {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }
    setActiveAlarmAlert(null);
  };

  // ----------------------------------------------------
  // CALENDAR HANDLERS
  // ----------------------------------------------------
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle.trim()) return;

    const added: StarkEvent = {
      id: 'evt_' + Math.random().toString(36).substr(2, 9),
      title: newEventTitle,
      date: newEventDate,
      time: newEventTime,
      type: newEventType,
      description: newEventDesc
    };

    setEvents(prev => [...prev, added].sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`)));
    setNewEventTitle('');
    setNewEventDesc('');

    jarvisSpeak(`Compromisso agendado com sucesso, Sir Henrique.`);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  // Cronogramas / Timelines Handlers
  const handleAddTimeline = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTimelineTitle.trim()) return;

    const added: StarkTimeline = {
      id: Math.random().toString(),
      title: newTimelineTitle,
      targetDate: newTimelineDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      tasks: []
    };

    setTimelines(prev => [...prev, added]);
    setNewTimelineTitle('');
    setNewTimelineDate('');
    jarvisSpeak(`Novo cronograma de acompanhamento criado, Sir.`);
  };

  const handleAddTimelineTask = (timelineId: string) => {
    const text = newTimelineTaskText[timelineId];
    if (!text || !text.trim()) return;

    setTimelines(prev => prev.map(tl => {
      if (tl.id === timelineId) {
        return {
          ...tl,
          tasks: [...tl.tasks, { id: Math.random().toString(), text, done: false }]
        };
      }
      return tl;
    }));

    setNewTimelineTaskText(prev => ({ ...prev, [timelineId]: '' }));
  };

  const handleToggleTimelineTask = (timelineId: string, taskId: string) => {
    setTimelines(prev => prev.map(tl => {
      if (tl.id === timelineId) {
        return {
          ...tl,
          tasks: tl.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t)
        };
      }
      return tl;
    }));
  };

  const handleDeleteTimeline = (id: string) => {
    setTimelines(prev => prev.filter(tl => tl.id !== id));
  };

  // ----------------------------------------------------
  // STOPWATCH HANDLERS
  // ----------------------------------------------------
  const handleStartStopwatch = () => {
    if (stopwatchRunning) {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
        stopwatchIntervalRef.current = null;
      }
      setStopwatchRunning(false);
    } else {
      setStopwatchRunning(true);
      stopwatchIntervalRef.current = setInterval(() => {
        setStopwatchTime(prev => prev + 1);
      }, 100);
    }
  };

  const handleResetStopwatch = () => {
    if (stopwatchIntervalRef.current) {
      clearInterval(stopwatchIntervalRef.current);
      stopwatchIntervalRef.current = null;
    }
    setStopwatchRunning(false);
    setStopwatchTime(0);
    setLaps([]);
  };

  const handleRecordLap = () => {
    if (stopwatchRunning) {
      setLaps(prev => [stopwatchTime, ...prev]);
    }
  };

  const formatStopwatchTime = (timeInDeciseconds: number) => {
    const minutes = Math.floor(timeInDeciseconds / 600);
    const seconds = Math.floor((timeInDeciseconds % 600) / 10);
    const deciseconds = timeInDeciseconds % 10;
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${deciseconds}`;
  };

  // ----------------------------------------------------
  // ALARM HANDLERS
  // ----------------------------------------------------
  const handleAddAlarm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlarmTime) return;

    const added: StarkAlarm = {
      id: Math.random().toString(),
      time: newAlarmTime,
      label: newAlarmLabel || 'Alerta Stark',
      active: true
    };

    setAlarms(prev => [...prev, added].sort((a, b) => a.time.localeCompare(b.time)));
    setNewAlarmLabel('');
    jarvisSpeak(`Alarme programado para as ${newAlarmTime}, Sir.`);
  };

  const handleToggleAlarm = (id: string) => {
    setAlarms(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a));
  };

  const handleDeleteAlarm = (id: string) => {
    setAlarms(prev => prev.filter(a => a.id !== id));
  };

  // ----------------------------------------------------
  // AI GENERATOR HANDLERS & PDF EXPORT
  // ----------------------------------------------------
  const handleGenerateContent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicInput.trim()) return;

    setIsGenerating(true);
    setGeneratedContent(null);
    setUserAnswers({});
    setShowResults(false);
    jarvisSpeak(`Sintonizando inteligência Stark para projetar material heurístico sobre ${topicInput}...`);

    try {
      const result = await generateStarkWorkspaceContent(topicInput, generationType, questionsCount);
      setGeneratedContent(result);
      jarvisSpeak(`Material pedagógico sobre ${topicInput} concluído e carregado no painel, Sir.`);
    } catch (err) {
      console.error(err);
      jarvisSpeak(`Ocorreu uma flutuação na síntese cognitiva, Sir. Mas carreguei o modelo alternativo de backup.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (qId: number, optionIdx: number) => {
    if (showResults) return;
    setUserAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

  const handleFinishExam = () => {
    setShowResults(true);
    if (generatedContent?.questions) {
      const correctCount = generatedContent.questions.filter(q => userAnswers[q.id] === q.correctAnswer).length;
      jarvisSpeak(`Simulado finalizado, Sir Henrique. Você acertou ${correctCount} de ${generatedContent.questions.length} questões.`);
    }
  };

  // MAGICAL PDF EXPORTER
  const handleExportPDF = () => {
    if (!generatedContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Bloqueador de popups detectado! Por favor, autorize popups para que o PDF de estudo possa ser impresso.");
      return;
    }

    const isSimulado = generatedContent.type === 'simulado';
    let innerHTML = '';

    if (isSimulado && generatedContent.questions) {
      innerHTML = generatedContent.questions.map((q, idx) => `
        <div class="question-block">
          <div class="q-header">QUESTÃO ${idx + 1}</div>
          <div class="q-body">${q.question}</div>
          <div class="options-container">
            ${q.options.map((opt, oIdx) => `
              <div class="option-item ${q.correctAnswer === oIdx ? 'correct' : ''}">
                <span class="bubble">${String.fromCharCode(65 + oIdx)}</span>
                <span class="opt-text">${opt}</span>
              </div>
            `).join('')}
          </div>
          <div class="explanation-box">
            <strong>CORREÇÃO E JUSTIFICATIVA:</strong><br/>
            ${q.explanation}
          </div>
        </div>
      `).join('');
    } else if (generatedContent.tasks) {
      innerHTML = generatedContent.tasks.map((t, idx) => `
        <div class="task-block">
          <div class="t-header">FASE DE EXECUÇÃO ${idx + 1}: ${t.title}</div>
          <div class="t-meta">
            <span>DIFICULDADE: ${t.difficulty.toUpperCase()}</span> | 
            <span>ESTIMATIVA: ${t.estimatedMinutes} MINUTOS</span>
          </div>
          <div class="t-desc">${t.description}</div>
        </div>
      `).join('');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${generatedContent.title}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap');
            
            @page {
              size: A4;
              margin: 1.5cm;
            }
            
            body {
              font-family: 'Inter', sans-serif;
              color: #0f172a;
              background-color: #ffffff;
              line-height: 1.6;
              font-size: 13px;
              margin: 0;
              padding: 0;
            }
            
            .container {
              max-width: 100%;
              margin: 0 auto;
            }
            
            /* Stark Tech Header styling */
            .stark-header {
              border: 2px solid #0f172a;
              padding: 20px;
              margin-bottom: 30px;
              background: #f8fafc;
              position: relative;
            }
            
            .stark-header h1 {
              font-family: 'JetBrains Mono', monospace;
              font-size: 20px;
              font-weight: 700;
              letter-spacing: 3px;
              text-transform: uppercase;
              margin: 0 0 10px 0;
              color: #0f172a;
            }
            
            .stark-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              font-size: 10px;
              font-family: 'JetBrains Mono', monospace;
              border-top: 1px solid #cbd5e1;
              padding-top: 12px;
              margin-top: 10px;
              text-transform: uppercase;
              color: #475569;
            }
            
            .stark-grid div {
              line-height: 1.4;
            }
            
            .doc-title {
              font-size: 22px;
              font-weight: 700;
              margin: 25px 0 15px 0;
              letter-spacing: -0.5px;
              color: #0f172a;
              border-left: 4px solid #0f172a;
              padding-left: 12px;
            }
            
            /* Question blocks styles */
            .question-block {
              margin-bottom: 30px;
              padding-bottom: 25px;
              border-bottom: 1px dashed #cbd5e1;
              page-break-inside: avoid;
            }
            
            .q-header {
              font-family: 'JetBrains Mono', monospace;
              font-size: 11px;
              font-weight: 700;
              color: #ffffff;
              background: #0f172a;
              padding: 4px 10px;
              display: inline-block;
              margin-bottom: 12px;
              letter-spacing: 1px;
            }
            
            .q-body {
              font-size: 14px;
              font-weight: 500;
              margin-bottom: 15px;
              color: #0f172a;
            }
            
            .options-container {
              display: grid;
              gap: 8px;
              margin: 15px 0;
            }
            
            .option-item {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 10px 14px;
              border: 1px solid #e2e8f0;
              background: #f8fafc;
              border-radius: 6px;
              font-size: 13px;
            }
            
            .option-item.correct {
              background: #f0fdf4;
              border-color: #86efac;
            }
            
            .bubble {
              font-family: 'JetBrains Mono', monospace;
              font-weight: 700;
              background: #0f172a;
              color: #ffffff;
              width: 22px;
              height: 22px;
              border-radius: 4px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
            }
            
            .option-item.correct .bubble {
              background: #16a34a;
            }
            
            .opt-text {
              flex: 1;
              font-weight: 400;
            }
            
            .option-item.correct .opt-text {
              font-weight: 600;
              color: #15803d;
            }
            
            .explanation-box {
              margin-top: 12px;
              background: #f1f5f9;
              padding: 12px 18px;
              border-left: 4px solid #64748b;
              font-size: 12px;
              color: #334155;
            }
            
            /* Task item styles */
            .task-block {
              margin-bottom: 25px;
              padding: 20px;
              border: 1px solid #e2e8f0;
              background: #f8fafc;
              border-radius: 8px;
              page-break-inside: avoid;
            }
            
            .t-header {
              font-family: 'JetBrains Mono', monospace;
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 6px;
            }
            
            .t-meta {
              font-family: 'JetBrains Mono', monospace;
              font-size: 10px;
              color: #64748b;
              margin-bottom: 12px;
              font-weight: 600;
            }
            
            .t-desc {
              font-size: 13px;
              color: #334155;
            }
            
            /* Stark Tech Footer */
            .stark-footer {
              text-align: center;
              font-family: 'JetBrains Mono', monospace;
              font-size: 9px;
              color: #64748b;
              margin-top: 60px;
              border-top: 1px solid #cbd5e1;
              padding-top: 15px;
              line-height: 1.5;
              text-transform: uppercase;
            }
            
            @media print {
              body {
                background-color: #ffffff;
                color: #000;
              }
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="stark-header">
              <h1>STARK INDUSTRIES • ACADEMY CORE v4.0</h1>
              <div class="stark-grid">
                <div><strong>OPERADOR:</strong> HENRIQUE (CLEBSANTOS)</div>
                <div><strong>CANAL:</strong> J.A.R.V.I.S. AUTO-GENERATOR</div>
                <div><strong>DATA:</strong> ${new Date().toLocaleDateString('pt-BR')}</div>
              </div>
              <div class="stark-grid" style="border:none; margin-top:5px; padding-top:0;">
                <div><strong>TÓPICO:</strong> ${generatedContent.topic}</div>
                <div><strong>SEGURANÇA:</strong> CONFIDENCIAL STARK</div>
                <div><strong>BUFFER REF:</strong> STK-${Math.floor(Math.random() * 900000 + 100000)}</div>
              </div>
            </div>
            
            <div class="doc-title">${generatedContent.title}</div>
            
            <div class="doc-body">
              ${innerHTML}
            </div>
            
            <div class="stark-footer">
              DOCUMENTO CRIPTOGRAFADO COMPILADO DIRETAMENTE PELA INTELIGÊNCIA ARTIFICIAL J.A.R.V.I.S.<br/>
              © LABORATÓRIOS PESQUISA STARK — REPRODUÇÃO EXCLUSIVA PARA HENRIQUE.
            </div>
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="flex flex-col h-full bg-[#05070a]/95 text-white font-sans overflow-hidden border-l border-cyan-500/10 backdrop-blur-3xl relative z-30">
      
      {/* Tab Selectors */}
      <div className="flex items-center border-b border-white/5 bg-black/40 p-1.5 gap-1 flex-shrink-0 overflow-x-auto scrollbar-none flex-nowrap md:p-2">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 flex-shrink-0 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-[10px] md:text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
            activeTab === 'calendar' 
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)] font-mono' 
              : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
          }`}
        >
          <CalendarIcon size={13} className="flex-shrink-0" />
          <span>Agenda<span className="hidden sm:inline"> & Cronos</span></span>
        </button>
        <button
          onClick={() => setActiveTab('time')}
          className={`flex-1 flex-shrink-0 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-[10px] md:text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
            activeTab === 'time' 
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)] font-mono' 
              : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
          }`}
        >
          <Clock size={13} className="flex-shrink-0" />
          <span>Relógio<span className="hidden sm:inline"> & Alarme</span></span>
        </button>
        <button
          onClick={() => setActiveTab('generator')}
          className={`flex-1 flex-shrink-0 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-[10px] md:text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
            activeTab === 'generator' 
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)] font-mono' 
              : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
          }`}
        >
          <BookOpen size={13} className="flex-shrink-0" />
          <span>Simulados<span className="hidden sm:inline"> PDF</span></span>
        </button>
        <button
          onClick={() => setActiveTab('finance')}
          className={`flex-1 flex-shrink-0 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-[10px] md:text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
            activeTab === 'finance' 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)] font-mono' 
              : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
          }`}
        >
          <DollarSign size={13} className="flex-shrink-0" />
          <span>Finanças<span className="hidden sm:inline"> AI</span></span>
        </button>
        <button
          onClick={() => setActiveTab('news')}
          className={`flex-1 flex-shrink-0 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-[10px] md:text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
            activeTab === 'news' 
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)] font-mono' 
              : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
          }`}
        >
          <Globe size={13} className="flex-shrink-0" />
          <span>Notícias<span className="hidden sm:inline"> Google</span></span>
        </button>
        <button
          onClick={() => setActiveTab('projects')}
          className={`flex-1 flex-shrink-0 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-[10px] md:text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
            activeTab === 'projects' 
              ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)] font-mono' 
              : 'text-white/40 hover:text-white/70 hover:bg-white/[0.02]'
          }`}
        >
          <ListTodo size={13} className="flex-shrink-0" />
          <span>Projetos<span className="hidden sm:inline"> Stark</span></span>
        </button>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all duration-300 flex items-center justify-center cursor-pointer"
          title="Fechar painel"
        >
          <X size={14} />
        </button>
      </div>

      {/* Neural Link / Local Brain Status */}
      <div className="bg-black/30 px-4 py-2 flex items-center justify-between border-b border-white/5 text-[11px] font-mono">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-cyan-400"></div>
          <span className="text-white/50">J.A.R.V.I.S. Core Brain:</span>
          <span className="text-cyan-400 font-semibold">Offline Local Ativo</span>
        </div>
        <div className="text-white/40 flex items-center gap-1">
          <Sparkles size={11} className="text-cyan-400" />
          <span>Sistemas Locais Estabilizados</span>
        </div>
      </div>

      {/* Tab Panels Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar space-y-6">

        {/* ---------------------------------------------------- */}
        {/* TAB 1: CALENDAR, EVENTS & CRONOGRAMAS */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'calendar' && (
          <div className="space-y-6 max-w-2xl mx-auto w-full">
            
            {/* Calendar Section Header */}
            <div className="space-y-1 text-center flex flex-col items-center justify-center">
              <h2 className="text-xs font-bold tracking-widest text-cyan-400 uppercase font-mono flex items-center gap-1.5 justify-center">
                <CalendarIcon size={12} className="text-cyan-400" />
                Agendamentos de Reuniões & Compromissos
              </h2>
              <p className="text-[10px] text-white/45 text-center">Agende reuniões com lembretes ativos de voz no dia e hora.</p>
            </div>

            {/* Quick Create Event Form */}
            <form onSubmit={handleAddEvent} className="bg-white/[0.01] border border-white/5 p-3.5 rounded-xl space-y-3 shadow-md backdrop-blur-sm">
              <input
                type="text"
                placeholder="Título da Reunião ou Compromisso..."
                value={newEventTitle}
                onChange={e => setNewEventTitle(e.target.value)}
                className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500/30 font-sans"
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-cyan-400/70 font-mono block">DATA</label>
                  <input
                    type="date"
                    value={newEventDate}
                    onChange={e => setNewEventDate(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:border-cyan-500/30 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-cyan-400/70 font-mono block">HORA</label>
                  <input
                    type="time"
                    value={newEventTime}
                    onChange={e => setNewEventTime(e.target.value)}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:border-cyan-500/30 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-cyan-400/70 font-mono block">TIPO</label>
                  <select
                    value={newEventType}
                    onChange={e => setNewEventType(e.target.value as any)}
                    className="w-full bg-[#0d0f14] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white/70 focus:outline-none focus:border-cyan-500/30"
                  >
                    <option value="Estudo">Estudo</option>
                    <option value="Reunião">Reunião</option>
                    <option value="Compromisso">Compromisso</option>
                    <option value="Pessoal">Pessoal</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-cyan-400/70 font-mono block">ADICIONAR</label>
                  <button
                    type="submit"
                    className="w-full bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 hover:text-white border border-cyan-500/20 rounded-lg py-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 font-mono"
                  >
                    <Plus size={12} />
                    <span>SALVAR</span>
                  </button>
                </div>
              </div>
            </form>

            {/* List of active events */}
            <div className="space-y-2">
              <h3 className="text-[9px] font-bold text-white/40 uppercase tracking-widest font-mono">Compromissos Agendados ({events.length})</h3>
              <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                {events.length === 0 ? (
                  <div className="text-center py-4 bg-white/[0.01] rounded-xl border border-dashed border-white/5 text-[10px] text-white/30 italic">
                    Nenhum compromisso marcado.
                  </div>
                ) : (
                  events.map(ev => {
                    const eventDate = new Date(`${ev.date}T00:00:00`);
                    return (
                      <div key={ev.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-start justify-between gap-3 shadow-sm hover:border-cyan-500/10 transition-colors">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded uppercase ${
                              ev.type === 'Reunião' ? 'bg-red-500/10 text-red-400 border border-red-500/10' :
                              ev.type === 'Estudo' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/10' :
                              ev.type === 'Compromisso' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                              'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                            }`}>
                              {ev.type}
                            </span>
                            <span className="text-[10px] font-mono text-cyan-400 font-bold">{ev.time}</span>
                          </div>
                          <h4 className="text-xs font-bold text-white/95 mt-1 truncate">{ev.title}</h4>
                          <p className="text-[9px] text-white/30 font-mono mt-0.5">
                            {eventDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="text-white/20 hover:text-red-400 transition-colors p-1.5 hover:bg-white/5 rounded-lg cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Google Calendar Sincronização Desativada em favor do Local Agenda */}

            {/* Cronogramas / Planners Segment */}
            <div className="border-t border-white/5 pt-5 space-y-4">
              <div className="space-y-1">
                <h2 className="text-xs font-bold tracking-widest text-cyan-400 uppercase font-mono flex items-center gap-1.5">
                  <ListTodo size={12} className="text-cyan-400" />
                  Cronogramas & Trilhas de Aprendizado
                </h2>
                <p className="text-[10px] text-white/45">Crie cronogramas e acompanhe as tarefas de cada um.</p>
              </div>

              {/* Quick Timeline Create Form */}
              <form onSubmit={handleAddTimeline} className="flex gap-2 bg-white/[0.01] border border-white/5 p-2 rounded-xl">
                <input
                  type="text"
                  placeholder="Nome do Cronograma (Ex: Estudar Zorin, Python)..."
                  value={newTimelineTitle}
                  onChange={e => setNewTimelineTitle(e.target.value)}
                  className="flex-1 bg-transparent text-xs px-2 focus:outline-none"
                />
                <button
                  type="submit"
                  className="bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 text-cyan-300 font-mono text-xs px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  CRIAR
                </button>
              </form>

              {/* Timelines Accordions */}
              <div className="space-y-4">
                {timelines.map(tl => (
                  <div key={tl.id} className="bg-white/[0.01] border border-white/5 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                      <div>
                        <h4 className="text-xs font-bold text-white/90">{tl.title}</h4>
                        <span className="text-[8px] font-mono text-white/30 uppercase">Prazo: {tl.targetDate}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteTimeline(tl.id)}
                        className="text-white/20 hover:text-red-400 transition-colors p-1 rounded-md"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>

                    {/* Task checklist of this timeline */}
                    <div className="space-y-1.5">
                      {tl.tasks.length === 0 ? (
                        <p className="text-[9px] text-white/30 italic">Sem tarefas adicionadas.</p>
                      ) : (
                        tl.tasks.map(t => (
                          <div 
                            key={t.id} 
                            onClick={() => handleToggleTimelineTask(tl.id, t.id)}
                            className="flex items-center gap-2 cursor-pointer group"
                          >
                            <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${
                              t.done 
                                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' 
                                : 'border-white/10 group-hover:border-cyan-500/30'
                            }`}>
                              {t.done && <Check size={10} />}
                            </div>
                            <span className={`text-[11px] transition-all ${t.done ? 'line-through text-white/30' : 'text-white/70 group-hover:text-white'}`}>
                              {t.text}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Timeline task quick add */}
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Adicionar passo..."
                        value={newTimelineTaskText[tl.id] || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setNewTimelineTaskText(prev => ({ ...prev, [tl.id]: val }));
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddTimelineTask(tl.id);
                        }}
                        className="flex-1 bg-white/[0.02] border border-white/5 rounded px-2.5 py-1 text-[10px] focus:outline-none focus:border-cyan-500/20"
                      />
                      <button
                        onClick={() => handleAddTimelineTask(tl.id)}
                        className="bg-white/5 hover:bg-white/10 text-white/80 p-1 px-2.5 rounded text-[10px] font-semibold"
                      >
                        ADD
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 2: TIMER (STOPWATCH) & ALARMES */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'time' && (
          <div className="space-y-6 max-w-2xl mx-auto w-full">
            
            {/* Cronômetro Section Header */}
            <div className="space-y-1 text-center flex flex-col items-center justify-center">
              <h2 className="text-xs font-bold tracking-widest text-cyan-400 uppercase font-mono flex items-center gap-1.5 justify-center">
                <Timer size={12} className="text-cyan-400 animate-spin [animation-duration:10s]" />
                Cronômetro Heurístico Stark
              </h2>
              <p className="text-[10px] text-white/45 text-center font-sans">Medição de performance física e mental com precisão de milissegundos.</p>
            </div>

            {/* Stunning Digital Stopwatch Face */}
            <div className="bg-[#020305] border border-cyan-500/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 relative shadow-[0_0_30px_rgba(6,182,212,0.03)] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.02] to-transparent pointer-events-none" />
              
              <div className="text-4xl md:text-5xl font-mono font-extralight tracking-widest text-cyan-300 drop-shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                {formatStopwatchTime(stopwatchTime)}
              </div>

              <div className="flex items-center gap-3 relative z-10 w-full justify-center">
                <button
                  onClick={handleStartStopwatch}
                  className={`flex-1 max-w-[110px] py-2 border rounded-xl text-xs font-semibold tracking-wide flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    stopwatchRunning 
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25' 
                      : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/25'
                  }`}
                >
                  {stopwatchRunning ? <Pause size={12} /> : <Play size={12} />}
                  <span>{stopwatchRunning ? 'PAUSAR' : 'INICIAR'}</span>
                </button>
                <button
                  onClick={handleRecordLap}
                  disabled={!stopwatchRunning}
                  className="p-2 border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] text-white/60 disabled:opacity-40 rounded-xl cursor-pointer"
                  title="Marcar Volta"
                >
                  <TrendingUp size={14} />
                </button>
                <button
                  onClick={handleResetStopwatch}
                  className="p-2 border border-red-500/15 bg-red-500/5 hover:bg-red-500/10 text-red-400 rounded-xl cursor-pointer"
                  title="Reiniciar Cronômetro"
                >
                  <RotateCcw size={14} />
                </button>
              </div>

              {/* Lap times stream */}
              {laps.length > 0 && (
                <div className="w-full border-t border-white/5 pt-3 max-h-[110px] overflow-y-auto pr-1">
                  <div className="space-y-1.5 font-mono text-[9px]">
                    {laps.map((lap, idx) => (
                      <div key={idx} className="flex justify-between text-white/40 border-b border-white/[0.02] pb-1">
                        <span>LAP {laps.length - idx}</span>
                        <span className="text-cyan-400/80 font-bold">{formatStopwatchTime(lap)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Alarmes Section Header */}
            <div className="border-t border-white/5 pt-5 space-y-4">
              <div className="space-y-1 text-center flex flex-col items-center justify-center">
                <h2 className="text-xs font-bold tracking-widest text-cyan-400 uppercase font-mono flex items-center gap-1.5 justify-center">
                  <Bell size={12} className="text-cyan-400" />
                  Grade de Alarmes Stark
                </h2>
                <p className="text-[10px] text-white/45 text-center">Ative alertas para suas rotinas e J.A.R.V.I.S. irá alertá-lo com áudio.</p>
              </div>

              {/* Quick Create Alarm Form */}
              <form onSubmit={handleAddAlarm} className="bg-white/[0.01] border border-white/5 p-3 rounded-xl flex flex-col md:flex-row gap-2">
                <input
                  type="time"
                  value={newAlarmTime}
                  onChange={e => setNewAlarmTime(e.target.value)}
                  className="bg-white/[0.02] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white/80 focus:outline-none focus:border-cyan-500/30 font-mono"
                />
                <input
                  type="text"
                  placeholder="Etiqueta do Alarme (Ex: Café, Treinar)..."
                  value={newAlarmLabel}
                  onChange={e => setNewAlarmLabel(e.target.value)}
                  className="flex-1 bg-white/[0.02] border border-white/5 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-cyan-500/30"
                />
                <button
                  type="submit"
                  className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white border border-cyan-500/20 px-4 py-1.5 rounded-lg text-xs font-bold tracking-wider font-mono cursor-pointer"
                >
                  SALVAR
                </button>
              </form>

              {/* List of active alarms */}
              <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                {alarms.map(al => (
                  <div key={al.id} className="bg-white/[0.02] border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="text-xl font-mono text-cyan-300 font-extralight tracking-wider">
                        {al.time}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white/90">{al.label}</div>
                        <span className="text-[8px] font-mono text-cyan-400/60 uppercase">
                          {al.active ? 'Ativo / Em Espera' : 'Desativado'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {/* Interactive toggle switch */}
                      <button
                        onClick={() => handleToggleAlarm(al.id)}
                        className={`w-8 h-4.5 rounded-full p-0.5 transition-colors relative cursor-pointer ${
                          al.active ? 'bg-cyan-500' : 'bg-white/10'
                        }`}
                      >
                        <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-md transition-transform ${
                          al.active ? 'translate-x-3.5' : 'translate-x-0'
                        }`} />
                      </button>

                      <button
                        onClick={() => handleDeleteAlarm(al.id)}
                        className="text-white/20 hover:text-red-400 p-1.5 rounded-md hover:bg-white/5"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 3: SIMULADOS & TAREFAS AI (PDF EXPORTER) */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'generator' && (
          <div className="space-y-6 max-w-2xl mx-auto w-full">
            
            {/* AI Generator Section Header */}
            <div className="space-y-1 text-center flex flex-col items-center justify-center">
              <h2 className="text-xs font-bold tracking-widest text-cyan-400 uppercase font-mono flex items-center gap-1.5 justify-center">
                <Sparkles size={12} className="text-cyan-400 animate-pulse" />
                Matriz de Simulados & Tarefas
              </h2>
              <p className="text-[10px] text-white/45 text-center">Gere provas de estudo ou sequências de trabalho completas e salve em PDF técnico.</p>
            </div>

            {/* Generator Form */}
            <form onSubmit={handleGenerateContent} className="bg-white/[0.01] border border-white/5 p-4 rounded-2xl space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-cyan-400/80 uppercase font-mono tracking-widest block">Tópico de Estudo ou Atividade</label>
                <input
                  type="text"
                  placeholder="Ex: Circuitos Elétricos, Leis de Kepler, Docker..."
                  value={topicInput}
                  onChange={e => setTopicInput(e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/5 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-cyan-500/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-cyan-400/80 uppercase font-mono tracking-widest block">Formatador</label>
                  <div className="grid grid-cols-2 gap-1 bg-black/30 p-1 rounded-lg border border-white/5">
                    <button
                      type="button"
                      onClick={() => setGenerationType('simulado')}
                      className={`py-1 rounded text-[10px] font-semibold tracking-wider transition-all uppercase ${
                        generationType === 'simulado' ? 'bg-cyan-500/10 text-cyan-300' : 'text-white/30 hover:text-white/60'
                      }`}
                    >
                      Prova
                    </button>
                    <button
                      type="button"
                      onClick={() => setGenerationType('tarefa')}
                      className={`py-1 rounded text-[10px] font-semibold tracking-wider transition-all uppercase ${
                        generationType === 'tarefa' ? 'bg-cyan-500/10 text-cyan-300' : 'text-white/30 hover:text-white/60'
                      }`}
                    >
                      Guia
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-cyan-400/80 uppercase font-mono tracking-widest block">Intensidade (Itens)</label>
                  <div className="flex items-center justify-between bg-black/30 border border-white/5 rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setQuestionsCount(prev => Math.max(3, prev - 1))}
                      className="px-2 text-white/50 hover:text-white font-mono"
                    >
                      -
                    </button>
                    <span className="text-xs font-mono font-bold text-cyan-400">{questionsCount}</span>
                    <button
                      type="button"
                      onClick={() => setQuestionsCount(prev => Math.min(10, prev + 1))}
                      className="px-2 text-white/50 hover:text-white font-mono"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isGenerating || !topicInput.trim()}
                className="w-full bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 text-cyan-300 hover:text-white disabled:opacity-40 py-2.5 rounded-xl text-xs font-bold tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer font-mono shadow-md"
              >
                {isGenerating ? (
                  <>
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                    <span>CONSTRUINDO REDE COGNITIVA...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={12} className="animate-pulse" />
                    <span>COMPILAR COM J.A.R.V.I.S.</span>
                  </>
                )}
              </button>
            </form>

            {/* Generated results rendering pane */}
            {generatedContent && (
              <div className="bg-[#020305] border border-white/5 rounded-2xl p-4 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <span className="text-[8px] font-mono tracking-widest font-bold text-cyan-400 uppercase">PRODUTO COMPILADO</span>
                    <h3 className="text-xs font-bold text-white/95 mt-0.5 uppercase truncate max-w-[180px]">{generatedContent.title}</h3>
                  </div>
                  <button
                    onClick={handleExportPDF}
                    className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl px-3 py-1.5 text-xs font-bold font-mono tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download size={12} />
                    <span>EXPORTAR PDF</span>
                  </button>
                </div>

                {/* Sub-pane rendering list of questions */}
                {generatedContent.type === 'simulado' && generatedContent.questions && (
                  <div className="space-y-4">
                    {generatedContent.questions.map((q, idx) => (
                      <div key={q.id} className="space-y-2 border-b border-white/[0.03] pb-3 last:border-0">
                        <h4 className="text-xs font-semibold leading-relaxed text-white/90">
                          {idx + 1}. {q.question}
                        </h4>
                        
                        <div className="grid gap-1.5 pl-1">
                          {q.options.map((opt, oIdx) => {
                            const isSelected = userAnswers[q.id] === oIdx;
                            const isCorrect = q.correctAnswer === oIdx;
                            
                            let borderClass = 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03]';
                            let bubbleClass = 'bg-white/5 text-white/50';

                            if (showResults) {
                              if (isCorrect) {
                                borderClass = 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300';
                                bubbleClass = 'bg-emerald-500/20 text-emerald-300';
                              } else if (isSelected) {
                                borderClass = 'border-red-500/30 bg-red-500/5 text-red-300';
                                bubbleClass = 'bg-red-500/20 text-red-300';
                              }
                            } else if (isSelected) {
                              borderClass = 'border-cyan-500/30 bg-cyan-500/5 text-cyan-300';
                              bubbleClass = 'bg-cyan-500/20 text-cyan-300';
                            }

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                disabled={showResults}
                                onClick={() => handleSelectOption(q.id, oIdx)}
                                className={`w-full text-left rounded-lg p-2.5 border text-[11px] leading-snug transition-all flex items-center gap-2.5 cursor-pointer ${borderClass}`}
                              >
                                <span className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center font-mono font-bold text-[9px] ${bubbleClass}`}>
                                  {String.fromCharCode(65 + oIdx)}
                                </span>
                                <span className="flex-1">{opt}</span>
                              </button>
                            );
                          })}
                        </div>

                        {showResults && (
                          <div className="bg-white/[0.02] border-l-2 border-cyan-500/30 p-2.5 rounded text-[10px] text-white/60 leading-relaxed italic">
                            <strong className="text-cyan-400 font-mono text-[9px] uppercase tracking-wider not-italic block mb-0.5">Correção Stark:</strong>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    ))}

                    {!showResults && (
                      <button
                        onClick={handleFinishExam}
                        className="w-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 py-2 rounded-xl text-xs font-bold tracking-widest uppercase hover:bg-cyan-500/30 font-mono cursor-pointer transition-colors"
                      >
                        ENVIAR RESPOSTAS
                      </button>
                    )}
                  </div>
                )}

                {/* Sub-pane rendering tasks guide */}
                {generatedContent.type === 'tarefa' && generatedContent.tasks && (
                  <div className="space-y-3">
                    {generatedContent.tasks.map((t, idx) => (
                      <div key={t.id} className="bg-white/[0.01] border border-white/5 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between border-b border-white/[0.03] pb-1.5">
                          <h4 className="text-xs font-bold text-white/90">Fase {idx + 1}: {t.title}</h4>
                          <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                            t.difficulty === 'Fácil' ? 'bg-emerald-500/10 text-emerald-400' :
                            t.difficulty === 'Médio' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-red-500/10 text-red-400'
                          }`}>
                            {t.difficulty}
                          </span>
                        </div>
                        <p className="text-[11px] text-white/50 leading-relaxed font-sans">{t.description}</p>
                        <div className="flex justify-end text-[8px] font-mono text-cyan-400/60 font-semibold uppercase">
                          Tempo Estimado: {t.estimatedMinutes} minutos
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 4: VIDA FINANCEIRA AI (FIRESTORE SYNCED) */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'finance' && (
          <div className="space-y-6 max-w-2xl mx-auto w-full animate-fadeIn">
            
            {/* Header */}
            <div className="space-y-1 text-center flex flex-col items-center justify-center">
              <h2 className="text-xs font-bold tracking-widest text-emerald-400 uppercase font-mono flex items-center gap-1.5 justify-center">
                <Wallet size={12} className="text-emerald-400" />
                Gestão Financeira & Nuvem Firestore
              </h2>
              <p className="text-[10px] text-white/45 text-center">Monitore receitas, gastos e metas de economia integrados ao J.A.R.V.I.S.</p>
            </div>

            {needsAuth ? (
              <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-6 text-center space-y-4 shadow-xl">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mx-auto">
                  <CreditCard size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xs font-bold text-white uppercase font-mono">Banco de Dados Desconectado</h3>
                  <p className="text-[10px] text-white/45 leading-relaxed max-w-xs mx-auto">
                    Conecte sua conta do Google para ativar o armazenamento permanente na nuvem (Firestore) ou use o modo local para testar livremente.
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-white border border-emerald-500/30 rounded-xl px-4 py-2.5 text-xs font-bold tracking-wider font-mono transition-all duration-300 cursor-pointer inline-flex items-center gap-2 justify-center"
                  >
                    <RefreshCw size={12} className="animate-spin" style={{ animationDuration: '4s' }} />
                    <span>SINALIZAR PROVEDOR GOOGLE</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const demoUserObj = { uid: 'demo_user', displayName: 'Henrique (Demo)', email: 'demo@stark.com' };
                      setGoogleUser(demoUserObj);
                      setNeedsAuth(false);
                      jarvisSpeak("Modo de simulação financeira local ativado, Sir Henrique.");
                      fetchFinanceAndCalendar(demoUserObj);
                    }}
                    className="w-full bg-white/5 hover:bg-white/10 text-white/80 hover:text-white border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold tracking-wider font-mono transition-all duration-300 cursor-pointer inline-flex items-center gap-2 justify-center"
                  >
                    <span>MODO DEMONSTRAÇÃO (LOCAL/OFFLINE)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Financial Sub-tab Navigation */}
                <div className="grid grid-cols-3 bg-white/[0.02] border border-white/5 rounded-xl p-1 text-[9px] font-mono font-bold tracking-wider">
                  <button
                    type="button"
                    onClick={() => {
                      setFinanceSubTab('dashboard');
                      setEditingTxId(null);
                      setEditingGoalId(null);
                    }}
                    className={`py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                      financeSubTab === 'dashboard' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 shadow-[0_0_8px_rgba(16,185,129,0.15)]' 
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    DASHBOARD GERAL
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFinanceSubTab('report');
                      setEditingTxId(null);
                      setEditingGoalId(null);
                    }}
                    className={`py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                      financeSubTab === 'report' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 shadow-[0_0_8px_rgba(16,185,129,0.15)]' 
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    FECHAMENTO DIA 30
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFinanceSubTab('goals');
                      setEditingTxId(null);
                      setEditingGoalId(null);
                    }}
                    className={`py-1.5 rounded-lg transition-all cursor-pointer text-center ${
                      financeSubTab === 'goals' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10 shadow-[0_0_8px_rgba(16,185,129,0.15)]' 
                        : 'text-white/40 hover:text-white/70'
                    }`}
                  >
                    METAS DE ECONOMIA
                  </button>
                </div>

                {/* COMPUTED FINANCE METRICS */}
                {(() => {
                  const totalIncome = transactions
                    .filter(t => t.type === 'income')
                    .reduce((sum, t) => sum + t.amount, 0);
                  const totalExpense = transactions
                    .filter(t => t.type === 'expense')
                    .reduce((sum, t) => sum + t.amount, 0);
                  const balance = totalIncome - totalExpense;

                  const chatTransactions = transactions.filter(t => t.source === 'chat');

                  // Categorize spending
                  const categorySpending: { [key: string]: number } = {};
                  transactions
                    .filter(t => t.type === 'expense')
                    .forEach(t => {
                      categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
                    });

                  // J.A.R.V.I.S Advice Logic
                  let jarvisStatusIcon = "🟢";
                  let jarvisAlert = "";
                  let jarvisSuggestion = "";
                  
                  if (totalExpense > totalIncome && totalIncome > 0) {
                    jarvisStatusIcon = "🔴";
                    jarvisAlert = "AVISO CRÍTICO: Sir Henrique, seu fluxo operacional está em déficit. Suas saídas superam suas entradas imediatas. Recomendo ativar protocolo de contingência de gastos secundários.";
                  } else if (totalExpense > totalIncome * 0.8 && totalIncome > 0) {
                    jarvisStatusIcon = "🟡";
                    jarvisAlert = "PROTOCOLO DE ATENÇÃO: Despesas atingiram a faixa de 80% do faturamento. Recomendo prudência com novos investimentos de lazer nesta quinzena, Sir.";
                  } else {
                    jarvisStatusIcon = "🟢";
                    jarvisAlert = "FLUXO ATIVO E SEGURO: Seus sistemas financeiros estão em perfeito equilíbrio, Sir. Sua liquidez operacional é excelente para alocação em metas de riqueza.";
                  }

                  let highestCategory = "";
                  let highestCategoryAmount = 0;
                  Object.entries(categorySpending).forEach(([cat, val]) => {
                    if (val > highestCategoryAmount) {
                      highestCategoryAmount = val;
                      highestCategory = cat;
                    }
                  });

                  if (highestCategory) {
                    const pctOfIncome = totalIncome > 0 ? ((highestCategoryAmount / totalIncome) * 100).toFixed(0) : "N/A";
                    jarvisSuggestion = `💡 INSIGHT PATRIMONIAL: A categoria de maior evasão de capital é "${highestCategory}" com R$ ${highestCategoryAmount.toFixed(2)} acumulados (${pctOfIncome}% do seu fluxo de entrada). Recomendo revisar lançamentos dessa linha.`;
                  } else {
                    jarvisSuggestion = "💡 PROTOCOLO RECOMENDADO: Cadastre uma meta de economia de curto prazo. O J.A.R.V.I.S. ajudará a realocar seus rendimentos mensais de forma otimizada.";
                  }

                  // Render Tab Content
                  if (financeSubTab === 'dashboard') {
                    return (
                      <div className="space-y-5 animate-fadeIn">
                        {/* Executive Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 space-y-1 relative overflow-hidden">
                            <div className="absolute right-1 top-1 text-white/[0.02]"><Wallet size={24} /></div>
                            <span className="text-[7.5px] font-bold text-white/30 uppercase tracking-widest font-mono">Saldo Geral</span>
                            <div className={`text-xs md:text-sm font-mono font-bold tracking-tight truncate ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              R$ {balance.toFixed(2)}
                            </div>
                          </div>
                          <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 space-y-1 relative overflow-hidden">
                            <div className="absolute right-1 top-1 text-emerald-500/[0.02]"><TrendingUp size={24} /></div>
                            <span className="text-[7.5px] font-bold text-emerald-400/50 uppercase tracking-widest font-mono flex items-center gap-0.5">
                              <ArrowUpRight size={8} /> Receitas
                            </span>
                            <div className="text-xs md:text-sm font-mono font-bold tracking-tight truncate text-emerald-400">
                              R$ {totalIncome.toFixed(2)}
                            </div>
                          </div>
                          <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3 space-y-1 relative overflow-hidden">
                            <div className="absolute right-1 top-1 text-rose-500/[0.02]"><TrendingDown size={24} /></div>
                            <span className="text-[7.5px] font-bold text-rose-400/50 uppercase tracking-widest font-mono flex items-center gap-0.5">
                              <ArrowDownRight size={8} /> Despesas
                            </span>
                            <div className="text-xs md:text-sm font-mono font-bold tracking-tight truncate text-rose-400">
                              R$ {totalExpense.toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {/* J.A.R.V.I.S Intelligence Panel */}
                        <div className="bg-white/[0.01] border border-emerald-500/10 rounded-xl p-3.5 space-y-2.5 shadow-lg relative overflow-hidden">
                          <div className="absolute right-3 top-3 w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <div className="flex items-center gap-1.5">
                            <Sparkles size={12} className="text-emerald-400" />
                            <h3 className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest font-mono">CONSELHO E PROTOCOLO J.A.R.V.I.S.</h3>
                          </div>
                          <p className="text-[10px] text-white/75 font-mono leading-relaxed bg-[#0b0c10] border border-white/5 p-2.5 rounded-lg">
                            <span className="mr-1">{jarvisStatusIcon}</span>
                            {jarvisAlert}
                          </p>
                          <p className="text-[10px] text-emerald-300/80 font-mono leading-relaxed bg-emerald-500/[0.02] border border-emerald-500/5 p-2 rounded-lg">
                            {jarvisSuggestion}
                          </p>
                        </div>

                        {/* Inline Quick Add Transaction Form */}
                        <div className="bg-[#0b0c10] border border-white/5 p-3.5 rounded-xl space-y-3 shadow-md">
                          <h3 className="text-[9px] font-bold text-white/40 uppercase tracking-widest font-mono flex items-center gap-1.5">
                            <Plus size={11} className="text-emerald-400" />
                            Registrar Lançamento Manual
                          </h3>
                          <div className="space-y-2">
                            <input
                              type="text"
                              placeholder="Descrição (ex: Almoço, Salário...)"
                              value={txDesc}
                              onChange={e => setTxDesc(e.target.value)}
                              className="w-full bg-white/[0.01] border border-white/5 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-500/30 text-white"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div className="relative">
                                <span className="absolute left-2.5 top-1.5 text-xs text-white/30 font-mono font-bold">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  placeholder="0,00"
                                  value={txAmount}
                                  onChange={e => setTxAmount(e.target.value)}
                                  className="w-full bg-white/[0.01] border border-white/5 rounded-lg pl-7 pr-2 py-1.5 text-xs focus:outline-none focus:border-emerald-500/30 font-mono text-white"
                                />
                              </div>
                              <select
                                value={txType}
                                onChange={e => setTxType(e.target.value as any)}
                                className="w-full bg-[#0d0f14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                              >
                                <option value="expense">Gasto / Despesa</option>
                                <option value="income">Receita / Ganho</option>
                              </select>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <select
                                value={txCategory}
                                onChange={e => setTxCategory(e.target.value)}
                                className="w-full bg-[#0d0f14] border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
                              >
                                <option value="Alimentação">Alimentação</option>
                                <option value="Transporte">Transporte</option>
                                <option value="Lazer">Lazer</option>
                                <option value="Educação">Educação</option>
                                <option value="Moradia">Moradia</option>
                                <option value="Salário">Salário</option>
                                <option value="Investimentos">Investimentos</option>
                                <option value="Outros">Outros</option>
                              </select>
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!txDesc.trim() || !txAmount) return;
                                  try {
                                    await addTransaction(googleUser.uid, {
                                      description: txDesc,
                                      amount: parseFloat(txAmount),
                                      type: txType,
                                      category: txCategory,
                                      date: txDate,
                                      source: 'manual'
                                    });
                                    setTxDesc('');
                                    setTxAmount('');
                                    jarvisSpeak("Registro financeiro adicionado e salvo na nuvem Firestore, Sir Henrique.");
                                    fetchFinanceAndCalendar(googleUser);
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 hover:text-white border border-emerald-500/25 rounded-lg py-1.5 text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1 font-mono uppercase"
                              >
                                <Plus size={11} />
                                <span>GRAVAR</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Recent Transactions List with Edit & Delete */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="text-[9px] font-bold text-white/40 uppercase tracking-widest font-mono">RELAÇÃO DE TRANSAÇÕES ({transactions.length})</h3>
                          </div>
                          
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {isFinancesLoading ? (
                              <div className="text-center py-4 text-[10px] text-white/30 italic">
                                Carregando dados da nuvem...
                              </div>
                            ) : transactions.length === 0 ? (
                              <div className="text-center py-4 bg-white/[0.01] rounded-xl border border-dashed border-white/5 text-[10px] text-white/30 italic">
                                Nenhuma transação cadastrada no momento.
                              </div>
                            ) : (
                              transactions.map(t => {
                                const dateObj = new Date(t.date + 'T00:00:00');
                                const isEditing = editingTxId === t.id;

                                if (isEditing) {
                                  return (
                                    <div key={t.id} className="bg-white/[0.02] border border-emerald-500/30 rounded-xl p-3 space-y-2.5 animate-fadeIn">
                                      <div className="text-[8px] font-mono font-bold text-emerald-400 uppercase">Editando Transação</div>
                                      <input
                                        type="text"
                                        value={editTxDesc}
                                        onChange={e => setEditTxDesc(e.target.value)}
                                        className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                                        placeholder="Descrição"
                                      />
                                      <div className="grid grid-cols-2 gap-2">
                                        <input
                                          type="number"
                                          step="0.01"
                                          value={editTxAmount}
                                          onChange={e => setEditTxAmount(e.target.value)}
                                          className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                                          placeholder="Valor"
                                        />
                                        <select
                                          value={editTxType}
                                          onChange={e => setEditTxType(e.target.value as any)}
                                          className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                                        >
                                          <option value="expense">Despesa</option>
                                          <option value="income">Receita</option>
                                        </select>
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <select
                                          value={editTxCategory}
                                          onChange={e => setEditTxCategory(e.target.value)}
                                          className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-2 py-1 text-xs text-white"
                                        >
                                          <option value="Alimentação">Alimentação</option>
                                          <option value="Transporte">Transporte</option>
                                          <option value="Lazer">Lazer</option>
                                          <option value="Educação">Educação</option>
                                          <option value="Moradia">Moradia</option>
                                          <option value="Salário">Salário</option>
                                          <option value="Investimentos">Investimentos</option>
                                          <option value="Outros">Outros</option>
                                        </select>
                                        <div className="flex gap-1.5">
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              if (!editTxDesc.trim() || !editTxAmount) return;
                                              try {
                                                await updateTransaction(t.id, {
                                                  description: editTxDesc,
                                                  amount: parseFloat(editTxAmount),
                                                  type: editTxType,
                                                  category: editTxCategory,
                                                  date: editTxDate
                                                });
                                                setEditingTxId(null);
                                                jarvisSpeak("Lançamento atualizado Sir.");
                                                fetchFinanceAndCalendar(googleUser);
                                              } catch (err) {
                                                console.error(err);
                                              }
                                            }}
                                            className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-[9px] font-bold font-mono cursor-pointer"
                                          >
                                            SALVAR
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingTxId(null)}
                                            className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 border border-white/10 rounded-lg text-[9px] font-bold font-mono cursor-pointer"
                                          >
                                            SAIR
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <div key={t.id} className="bg-white/[0.01] border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-emerald-500/10 transition-colors">
                                    <div className="min-w-0 flex items-center gap-2.5">
                                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        t.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                      }`}>
                                        {t.type === 'income' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                          <h4 className="text-xs font-bold text-white/95 truncate max-w-[120px]">{t.description}</h4>
                                          {t.source === 'chat' && (
                                            <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[6.5px] font-bold font-mono px-1 py-0.2 rounded tracking-wider uppercase animate-pulse">
                                              📡 CHAT
                                            </span>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <span className="text-[7.5px] font-mono px-1 py-0.2 rounded uppercase bg-white/5 text-white/40 border border-white/5">
                                            {t.category}
                                          </span>
                                          <span className="text-[8px] text-white/30 font-mono">
                                            {dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs font-mono font-bold ${t.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {t.type === 'income' ? '+' : '-'} R$ {t.amount.toFixed(2)}
                                      </span>
                                      
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingTxId(t.id);
                                            setEditTxDesc(t.description);
                                            setEditTxAmount(t.amount.toString());
                                            setEditTxType(t.type);
                                            setEditTxCategory(t.category);
                                            setEditTxDate(t.date);
                                          }}
                                          className="text-white/20 hover:text-emerald-400 transition-colors p-1 rounded hover:bg-white/5 cursor-pointer"
                                          title="Editar"
                                        >
                                          <Edit2 size={10} />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              await deleteTransaction(t.id);
                                              jarvisSpeak("Registro removido Sir.");
                                              fetchFinanceAndCalendar(googleUser);
                                            } catch (err) { console.error(err); }
                                          }}
                                          className="text-white/20 hover:text-rose-400 transition-colors p-1 rounded hover:bg-white/5 cursor-pointer"
                                          title="Deletar"
                                        >
                                          <Trash2 size={10} />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                        {/* Integration Chat Log Subview */}
                        {chatTransactions.length > 0 && (
                          <div className="bg-cyan-500/[0.01] border border-cyan-500/10 rounded-xl p-3 space-y-2">
                            <h4 className="text-[8.5px] font-bold text-cyan-400 font-mono tracking-widest uppercase flex items-center gap-1.5">
                              <span>📡 INTERAÇÕES CHAT J.A.R.V.I.S. ({chatTransactions.length})</span>
                            </h4>
                            <p className="text-[9px] text-white/40 font-mono leading-relaxed">
                              Estes lançamentos foram capturados de forma 100% autônoma pelo J.A.R.V.I.S. a partir de comandos de voz ou mensagens no chat do Senhor.
                            </p>
                            <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                              {chatTransactions.slice(0, 3).map(ct => (
                                <div key={ct.id} className="flex justify-between text-[9px] font-mono text-white/60 bg-white/[0.01] p-1.5 rounded border border-white/5">
                                  <span>🤖 {ct.description}</span>
                                  <span className={ct.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}>
                                    R$ {ct.amount.toFixed(2)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (financeSubTab === 'report') {
                    // Day 30 Monthly Closure Report
                    const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;
                    
                    // Render category breakdown charts
                    const maxSpending = Math.max(...Object.values(categorySpending), 1);

                    const handleSpeakReport = () => {
                      const spokenReport = `Sir Henrique, preparei seu relatório de fechamento de ciclo do dia trinta. Suas entradas somaram ${totalIncome.toFixed(0)} reais, contra despesas totais de ${totalExpense.toFixed(0)} reais. Seu saldo líquido final resultou em ${balance.toFixed(0)} reais com uma taxa de economia de ${savingsRate} por cento. No meu parecer executivo: ${balance >= 0 ? 'Seus sistemas patrimoniais operam em superávit seguro. Mantenha os aportes nas metas de economia ativo.' : 'Seus gastos superaram seus rendimentos este mês. Recomendo acionar contenção de despesas imediatamente para manter sua liquidez.'}`;
                      jarvisSpeak(spokenReport);
                    };

                    return (
                      <div className="space-y-4 animate-fadeIn">
                        {/* Executive Report Frame */}
                        <div className="bg-[#0b0c10] border-2 border-emerald-500/10 rounded-2xl p-4 md:p-5 space-y-4 relative shadow-2xl">
                          <div className="absolute right-4 top-4 text-[7px] text-emerald-400 font-mono border border-emerald-500/20 px-2 py-0.5 rounded tracking-widest uppercase">
                            Protocolo Dia 30
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                              <FileText size={13} className="text-emerald-400" />
                              Relatório de Fechamento Financeiro
                            </h3>
                            <p className="text-[9px] text-white/30 font-mono">
                              Cliente: Sir Henrique (clebsantos) • Ciclo de Fechamento Diário
                            </p>
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-white/5" />

                          {/* Report KPI Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3.5 space-y-1">
                              <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Total de Entradas</span>
                              <div className="text-sm font-mono font-bold text-emerald-400">
                                R$ {totalIncome.toFixed(2)}
                              </div>
                              <p className="text-[7.5px] text-emerald-400/50 font-mono uppercase">Lançamentos de Receitas</p>
                            </div>
                            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3.5 space-y-1">
                              <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Total de Saídas</span>
                              <div className="text-sm font-mono font-bold text-rose-400">
                                R$ {totalExpense.toFixed(2)}
                              </div>
                              <p className="text-[7.5px] text-rose-400/50 font-mono uppercase">Lançamentos de Gastos</p>
                            </div>
                            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3.5 space-y-1">
                              <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Saldo de Ciclo</span>
                              <div className={`text-sm font-mono font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                R$ {balance.toFixed(2)}
                              </div>
                              <p className="text-[7.5px] text-white/30 font-mono uppercase">Acumulado Líquido</p>
                            </div>
                            <div className="bg-white/[0.01] border border-white/5 rounded-xl p-3.5 space-y-1">
                              <span className="text-[8px] font-mono text-white/40 uppercase tracking-widest">Taxa de Economia</span>
                              <div className={`text-sm font-mono font-bold ${savingsRate >= 20 ? 'text-emerald-400' : 'text-yellow-400'}`}>
                                {savingsRate}%
                              </div>
                              <p className="text-[7.5px] text-white/30 font-mono uppercase">Meta Ideal: 20%</p>
                            </div>
                          </div>

                          {/* Category Distribution chart */}
                          <div className="space-y-2.5">
                            <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest font-mono">Gastos Separados por Categoria</span>
                            
                            {Object.entries(categorySpending).length === 0 ? (
                              <div className="text-center py-2 text-[8px] font-mono text-white/30 italic">
                                Nenhuma despesa para granular.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {Object.entries(categorySpending).map(([cat, val]) => {
                                  const widthPct = Math.min(100, Math.round((val / maxSpending) * 100)) || 0;
                                  const pctOfTotal = totalExpense > 0 ? Math.round((val / totalExpense) * 100) : 0;
                                  return (
                                    <div key={cat} className="space-y-1 bg-white/[0.005] border border-white/5 p-2 rounded-lg">
                                      <div className="flex justify-between text-[9px] font-mono">
                                        <span className="text-white/70 font-semibold">{cat}</span>
                                        <span className="text-rose-400 font-bold">R$ {val.toFixed(2)} ({pctOfTotal}%)</span>
                                      </div>
                                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div 
                                          className="h-full bg-rose-500 rounded-full transition-all duration-500 shadow-[0_0_6px_rgba(239,68,68,0.25)]" 
                                          style={{ width: `${widthPct}%` }}
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Goals Summary Breakdown */}
                          <div className="space-y-1.5">
                            <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest font-mono">Status Das Metas Mensais</span>
                            {goals.length === 0 ? (
                              <div className="text-center py-2 text-[8px] font-mono text-white/30 italic">Nenhum saving goal cadastrado.</div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                {goals.map(g => {
                                  const gPct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) || 0;
                                  return (
                                    <div key={g.id} className="bg-white/[0.01] border border-white/5 p-2 rounded-lg text-[9px] font-mono space-y-1">
                                      <div className="flex justify-between">
                                        <span className="text-white/80 font-bold truncate max-w-[80px]">{g.title}</span>
                                        <span className="text-emerald-400">{gPct}%</span>
                                      </div>
                                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${gPct}%` }} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* Divider */}
                          <div className="h-px bg-white/5" />

                          {/* CFO Jarvis Advisory */}
                          <div className="bg-emerald-500/[0.02] border border-emerald-500/10 p-3 rounded-xl space-y-1.5">
                            <h4 className="text-[8px] font-bold text-emerald-400 font-mono tracking-wider uppercase flex items-center gap-1">
                              <Sparkles size={10} /> Parecer CFO J.A.R.V.I.S.
                            </h4>
                            <p className="text-[10px] font-mono text-white/80 leading-relaxed">
                              Sir Henrique, {balance >= 0 
                                ? `seus sistemas financeiros encontram-se em saldo positivo de R$ ${balance.toFixed(2)}. Sua conduta patrimonial é exemplar e mantém suas metas ativas.` 
                                : `seus lançamentos acusam um déficit de R$ ${Math.abs(balance).toFixed(2)}. Recomendo realinhar o funil e frear despesas supérfluas.`}
                            </p>
                            <div className="space-y-1 pt-1 border-t border-white/5">
                              <div className="text-[7.5px] font-bold text-white/40 uppercase tracking-wider font-mono">Recomendações Práticas:</div>
                              <ul className="text-[8.5px] font-mono text-emerald-300/80 space-y-0.5 list-disc pl-3">
                                {balance < 0 && <li>Ativar protocolo de contenção de custos em Alimentação/Lazer imediatamente.</li>}
                                {savingsRate < 20 && <li>Tentar elevar sua taxa de economia para 20% para acelerar seus fundos.</li>}
                                {goals.length > 0 && <li>Alocar R$ 100 de excedente de segurança na sua meta principal.</li>}
                                <li>Revisar este relatório mensal com o J.A.R.V.I.S. a cada dia 30 de ciclo.</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        {/* Speech Button */}
                        <button
                          type="button"
                          onClick={handleSpeakReport}
                          className="w-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/20 py-2.5 rounded-xl font-bold font-mono text-xs tracking-widest cursor-pointer transition-colors uppercase flex items-center justify-center gap-2"
                        >
                          <Volume2 size={13} className="animate-pulse" />
                          OUVIR BRIEFING DO RELATÓRIO
                        </button>
                      </div>
                    );
                  }

                  if (financeSubTab === 'goals') {
                    // Savings Goals Tab
                    return (
                      <div className="space-y-4 animate-fadeIn">
                        {/* Header & Quick Add Goal */}
                        <div className="flex items-center justify-between">
                          <h3 className="text-[9px] font-bold text-white/40 uppercase tracking-widest font-mono flex items-center gap-1.5">
                            <PiggyBank size={11} className="text-emerald-400" />
                            Metas de Economia Ativas ({goals.length})
                          </h3>
                          <button
                            type="button"
                            onClick={() => setShowAddGoalModal(!showAddGoalModal)}
                            className="text-[9px] text-emerald-400 hover:text-emerald-300 font-bold font-mono uppercase tracking-wider cursor-pointer"
                          >
                            {showAddGoalModal ? "Fechar" : "Nova Meta"}
                          </button>
                        </div>

                        {showAddGoalModal && (
                          <div className="bg-[#0b0c10] border border-emerald-500/10 p-3.5 rounded-xl space-y-2.5 animate-fadeIn">
                            <h4 className="text-[8px] font-mono font-bold text-emerald-400 uppercase tracking-wider">Criar Novo Objetivo de Poupança</h4>
                            <input
                              type="text"
                              placeholder="Nome do Objetivo (ex: Notebook Stark...)"
                              value={goalTitleInput}
                              onChange={e => setGoalTitleInput(e.target.value)}
                              className="w-full bg-white/[0.01] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="number"
                                placeholder="Valor Alvo (R$)"
                                value={goalTargetInput}
                                onChange={e => setGoalTargetInput(e.target.value)}
                                className="w-full bg-white/[0.01] border border-white/5 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={async () => {
                                  if (!goalTitleInput.trim() || !goalTargetInput) return;
                                  try {
                                    await saveGoal(googleUser.uid, {
                                      id: '',
                                      title: goalTitleInput,
                                      targetAmount: parseFloat(goalTargetInput),
                                      currentAmount: 0
                                    });
                                    setGoalTitleInput('');
                                    setGoalTargetInput('');
                                    setShowAddGoalModal(false);
                                    jarvisSpeak("Nova meta de economia estabelecida no Firestore, Sir.");
                                    fetchFinanceAndCalendar(googleUser);
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="w-full bg-emerald-500/15 text-emerald-300 hover:text-white border border-emerald-500/20 rounded-lg py-1.5 text-xs font-bold font-mono cursor-pointer transition-colors"
                              >
                                CRIAR META
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Goals List */}
                        {goals.length === 0 ? (
                          <div className="text-center py-6 bg-white/[0.01] rounded-xl border border-dashed border-white/5 text-[10px] text-white/30 italic">
                            Nenhuma meta de poupança cadastrada no momento.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {goals.map(g => {
                              const pct = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) || 0;
                              const isEditingGoal = editingGoalId === g.id;

                              if (isEditingGoal) {
                                return (
                                  <div key={g.id} className="bg-white/[0.02] border border-emerald-500/30 rounded-xl p-3.5 space-y-2.5 animate-fadeIn">
                                    <div className="text-[8px] font-mono font-bold text-emerald-400 uppercase">Editando Meta Financeira</div>
                                    <input
                                      type="text"
                                      value={editGoalTitle}
                                      onChange={e => setEditGoalTitle(e.target.value)}
                                      className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white"
                                      placeholder="Título da Meta"
                                    />
                                    <div className="grid grid-cols-2 gap-2">
                                      <div className="space-y-1">
                                        <span className="text-[7.5px] font-mono text-white/40 block">Valor Alvo (R$):</span>
                                        <input
                                          type="number"
                                          value={editGoalTarget}
                                          onChange={e => setEditGoalTarget(e.target.value)}
                                          className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                                          placeholder="Alvo"
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <span className="text-[7.5px] font-mono text-white/40 block">Valor Poupado (R$):</span>
                                        <input
                                          type="number"
                                          value={editGoalCurrent}
                                          onChange={e => setEditGoalCurrent(e.target.value)}
                                          className="w-full bg-[#0d0f14] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
                                          placeholder="Poupado"
                                        />
                                      </div>
                                    </div>
                                    <div className="flex gap-2 pt-1">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          if (!editGoalTitle.trim() || !editGoalTarget) return;
                                          try {
                                            await saveGoal(googleUser.uid, {
                                              id: g.id,
                                              title: editGoalTitle,
                                              targetAmount: parseFloat(editGoalTarget),
                                              currentAmount: parseFloat(editGoalCurrent)
                                            });
                                            setEditingGoalId(null);
                                            jarvisSpeak("Meta financeira atualizada, Sir.");
                                            fetchFinanceAndCalendar(googleUser);
                                          } catch (err) {
                                            console.error(err);
                                          }
                                        }}
                                        className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold font-mono py-1 transition-colors cursor-pointer"
                                      >
                                        SALVAR
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingGoalId(null)}
                                        className="flex-1 bg-white/5 hover:bg-white/10 text-white/60 border border-white/10 rounded-lg text-xs font-bold font-mono py-1 transition-colors cursor-pointer"
                                      >
                                        CANCELAR
                                      </button>
                                    </div>
                                  </div>
                                );
                              }

                              return (
                                <div key={g.id} className="bg-white/[0.01] border border-white/5 rounded-xl p-3.5 space-y-2.5 relative hover:border-emerald-500/10 transition-all duration-300">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <h4 className="text-xs font-bold text-white/95">{g.title}</h4>
                                      <p className="text-[9px] text-white/45 font-mono mt-0.5">
                                        R$ {g.currentAmount.toFixed(2)} de R$ {g.targetAmount.toFixed(2)}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setEditingGoalId(g.id);
                                          setEditGoalTitle(g.title);
                                          setEditGoalTarget(g.targetAmount.toString());
                                          setEditGoalCurrent(g.currentAmount.toString());
                                        }}
                                        className="text-[8px] bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-white/70 font-mono cursor-pointer border border-white/5 hover:text-white transition-colors uppercase font-bold"
                                      >
                                        EDITAR
                                      </button>
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            await deleteGoal(g.id);
                                            jarvisSpeak("Meta financeira removida Sir.");
                                            fetchFinanceAndCalendar(googleUser);
                                          } catch (err) { console.error(err); }
                                        }}
                                        className="text-white/20 hover:text-rose-400 p-1 rounded hover:bg-white/5 cursor-pointer transition-colors"
                                      >
                                        <Trash2 size={11} />
                                      </button>
                                    </div>
                                  </div>
                                  {/* Progress bar */}
                                  <div className="space-y-1">
                                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <div className="flex justify-end text-[7.5px] font-mono font-bold text-emerald-400 tracking-wider">
                                      {pct}% COMPLETO
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* TAB 5: GOOGLE NEWS & DISCOVER */}
        {/* ---------------------------------------------------- */}
        {activeTab === 'news' && (
          <div className="space-y-5 max-w-2xl mx-auto w-full">
            
            {/* Header / Brand */}
            <div className="text-center flex flex-col items-center justify-center space-y-1.5 py-2">
              <div className="flex items-center gap-1.5 text-lg font-extrabold tracking-tight">
                <span className="text-[#4285F4]">G</span>
                <span className="text-[#EA4335]">o</span>
                <span className="text-[#FBBC05]">o</span>
                <span className="text-[#4285F4]">g</span>
                <span className="text-[#34A853]">l</span>
                <span className="text-[#EA4335]">e</span>
                <span className="text-white/80 ml-1.5 font-sans font-light tracking-widest uppercase text-xs">Notícias</span>
              </div>
              <p className="text-[9px] text-white/45 max-w-[320px] text-center uppercase tracking-[0.2em] font-mono leading-relaxed">
                CENTRAL MUNDIAL • SISTEMA DE DESCOBERTAS
              </p>
            </div>

            {/* Filter Categories */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-none flex-nowrap border-b border-white/5">
              {['Todos', 'Tecnologia', 'Ciência', 'Economia', 'Mundo'].map((cat) => {
                const isActive = newsCategoryFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewsCategoryFilter(cat)}
                    className={`flex-shrink-0 px-3.5 py-1.5 text-[9px] font-mono font-bold uppercase rounded-full border transition-all cursor-pointer ${
                      isActive
                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                        : 'bg-white/[0.01] border-white/5 text-white/40 hover:text-white/70'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            {/* News Stream */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {isLoadingNews ? (
                <div className="col-span-full flex flex-col items-center justify-center py-12 space-y-3">
                  <div className="w-6 h-6 border-2 border-cyan-500/20 border-t-cyan-400 rounded-full animate-spin" />
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono">
                    Sincronizando feed mundial...
                  </p>
                </div>
              ) : (news || []).filter(item => {
                if (newsCategoryFilter === 'Todos') return true;
                return (item.category || '').toLowerCase().includes(newsCategoryFilter.toLowerCase());
              }).length === 0 ? (
                <div className="col-span-full text-center py-10 bg-white/[0.01] rounded-2xl border border-dashed border-white/5 text-xs text-white/30 italic">
                  Nenhuma manchete correspondente encontrada.
                </div>
              ) : (
                (news || []).filter(item => {
                  if (newsCategoryFilter === 'Todos') return true;
                  return (item.category || '').toLowerCase().includes(newsCategoryFilter.toLowerCase());
                }).map((item, idx) => {
                  // Determine background gradient depending on category
                  let grad = 'from-blue-500/5 to-indigo-500/5';
                  let badgeColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
                  
                  if ((item.category || '').toLowerCase().includes('tec')) {
                    grad = 'from-cyan-500/5 to-blue-500/5';
                    badgeColor = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                  } else if ((item.category || '').toLowerCase().includes('ciê') || (item.category || '').toLowerCase().includes('cie')) {
                    grad = 'from-purple-500/5 to-pink-500/5';
                    badgeColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
                  } else if ((item.category || '').toLowerCase().includes('eco') || (item.category || '').toLowerCase().includes('fin')) {
                    grad = 'from-emerald-500/5 to-teal-500/5';
                    badgeColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                  } else if ((item.category || '').toLowerCase().includes('mun') || (item.category || '').toLowerCase().includes('pol')) {
                    grad = 'from-amber-500/5 to-orange-500/5';
                    badgeColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
                  }

                  return (
                    <div 
                      key={idx} 
                      className={`group relative overflow-hidden bg-gradient-to-br ${grad} border border-white/5 hover:border-cyan-500/20 rounded-2xl p-4 shadow-sm hover:shadow-[0_4px_24px_rgba(6,182,212,0.05)] transition-all duration-300`}
                    >
                      {/* Top Row: category and source */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className={`text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 rounded border ${badgeColor}`}>
                          {item.category || 'Notícia'}
                        </span>
                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-white/40">
                          <Globe size={10} className="text-white/30" />
                          <span>{item.source}</span>
                          <span className="text-white/20">•</span>
                          <span>Recente</span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-xs md:text-[13px] font-bold text-white/90 group-hover:text-cyan-300 transition-colors tracking-wide leading-relaxed font-sans">
                        {item.title}
                      </h3>

                      {/* Action Row */}
                      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-white/[0.03]">
                        {onAskJarvisNews && (
                          <button
                            type="button"
                            onClick={() => onAskJarvisNews(item.title, item.source)}
                            className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white border border-cyan-500/15 rounded-xl text-[9px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Sparkles size={11} />
                            <span>Análise J.A.R.V.I.S.</span>
                          </button>
                        )}
                        {item.url && item.url !== "#" && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-white/[0.02] hover:bg-white/[0.06] text-white/65 hover:text-white border border-white/5 hover:border-white/10 rounded-xl text-[9px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1"
                          >
                            <span>Ler Matéria</span>
                            <ArrowUpRight size={11} />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 6: PROJECTS PANEL */}
        {activeTab === 'projects' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 animate-fadeIn scrollbar-none">
            {/* Header / Brand */}
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/5 border border-cyan-500/10 rounded-2xl p-4 relative overflow-hidden">
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-cyan-500/5 rounded-full blur-xl pointer-events-none" />
              <div className="flex items-center gap-2 mb-1">
                <ListTodo className="text-cyan-400" size={16} />
                <h2 className="text-xs font-semibold tracking-widest text-cyan-400 font-mono uppercase">
                  SISTEMA DE PROJETOS E DIRETRIZES
                </h2>
              </div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider font-semibold font-mono">
                Mapeamento Cognitivo de Iniciativas de Alta Relevância
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onAskJarvisProject) {
                      const allProjsSummary = projects.map(p => `- ${p.name} (${p.category.toUpperCase()})`).join('\n');
                      const project = {
                        name: "Visão Geral de Todos os Meus Projetos",
                        category: "andamento",
                        description: `Sintetizar o andamento das iniciativas atuais:\n${allProjsSummary}`,
                        objectives: "Garantir consistência estratégica e otimização de tempo em todas as frentes.",
                        resources: "Todos os listados no dashboard.",
                        deadline: "Consolidado Geral",
                        progress: "Múltiplos projetos ativos e planejados cadastrados no terminal."
                      };
                      onAskJarvisProject(project as any);
                    }
                  }}
                  className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white border border-cyan-500/15 rounded-xl text-[9px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles size={11} />
                  <span>Consultar J.A.R.V.I.S. Geral</span>
                </button>
              </div>
            </div>

            {/* Category Filter Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none pb-1">
              {(['Todos', 'andamento', 'planejamento', 'concluido', 'pausa'] as const).map(cat => {
                const isActive = projectFilter === cat;
                let label = cat === 'Todos' ? 'Todos' : 
                            cat === 'andamento' ? 'Em Andamento' : 
                            cat === 'planejamento' ? 'Planejamento' :
                            cat === 'concluido' ? 'Concluídos' : 'Em Pausa';
                let activeStyle = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
                if (cat === 'concluido') activeStyle = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setProjectFilter(cat)}
                    className={`flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[9px] font-mono font-semibold uppercase tracking-wider border transition-all cursor-pointer ${
                      isActive 
                        ? activeStyle + ' shadow-[0_0_10px_rgba(6,182,212,0.05)]' 
                        : 'bg-white/[0.01] border-white/5 hover:border-white/10 text-white/40'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Toggle Add Project Form button */}
            {!showAddProject && (
              <button
                type="button"
                onClick={() => setShowAddProject(true)}
                className="w-full py-3 bg-white/[0.01] hover:bg-cyan-500/5 text-white/70 hover:text-cyan-400 border border-dashed border-white/5 hover:border-cyan-500/20 rounded-2xl text-[10px] md:text-xs font-mono font-bold tracking-widest uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} />
                <span>Cadastrar Nova Iniciativa</span>
              </button>
            )}

            {/* Add Project Modal */}
            {showAddProject && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
                <div className="absolute inset-0 cursor-pointer" onClick={() => setShowAddProject(false)} />
                <form 
                  onSubmit={handleAddProject}
                  className="relative w-full max-w-lg bg-[#07090e] border border-cyan-500/30 rounded-2xl p-5 space-y-4 shadow-[0_0_50px_rgba(6,182,212,0.15)] animate-scaleUp max-h-[90vh] overflow-y-auto scrollbar-none"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-white/5">
                    <span className="text-xs font-bold tracking-widest text-cyan-400 font-mono uppercase flex items-center gap-2">
                      <ListTodo size={14} className="text-cyan-400" />
                      NOVA COGNIÇÃO DE PROJETO
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddProject(false)}
                      className="p-1 hover:bg-white/5 text-white/40 hover:text-white rounded-lg transition-colors cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/40 font-mono uppercase tracking-wider block">
                      Nome do Projeto / Iniciativa
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="E.g., Novo Hub de Integrações API"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/95 focus:outline-none focus:border-cyan-500/30 font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 font-mono uppercase tracking-wider block">
                        Prioridade / Status
                      </label>
                      <select
                        value={newProjectCategory}
                        onChange={(e: any) => setNewProjectCategory(e.target.value)}
                        className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-2 py-2 text-xs text-white/95 focus:outline-none focus:border-cyan-500/30 font-mono"
                      >
                        <option value="andamento">Em Andamento</option>
                        <option value="planejamento">Planejamento</option>
                        <option value="concluido">Concluído</option>
                        <option value="pausa">Em Pausa</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-white/40 font-mono uppercase tracking-wider block">
                        Prazo / Cronograma
                      </label>
                      <input
                        type="date"
                        required
                        value={newProjectDeadline}
                        onChange={(e) => setNewProjectDeadline(e.target.value)}
                        className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-2 py-1.5 text-xs text-white/95 focus:outline-none focus:border-cyan-500/30 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/40 font-mono uppercase tracking-wider block">
                      Descrição do Projeto
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="Visão abrangente e escopo executivo do projeto..."
                      value={newProjectDescription}
                      onChange={(e) => setNewProjectDescription(e.target.value)}
                      className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/95 focus:outline-none focus:border-cyan-500/30 font-sans resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/40 font-mono uppercase tracking-wider block">
                      Objetivos e Metas
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="E.g., Reduzir latência, consolidar vendas, automatizar tarefas..."
                      value={newProjectObjectives}
                      onChange={(e) => setNewProjectObjectives(e.target.value)}
                      className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/95 focus:outline-none focus:border-cyan-500/30 font-sans resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/40 font-mono uppercase tracking-wider block">
                      Recursos e Ferramentas Necessários
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="E.g., React, Firebase, OpenAI API, AWS Lambda..."
                      value={newProjectResources}
                      onChange={(e) => setNewProjectResources(e.target.value)}
                      className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/95 focus:outline-none focus:border-cyan-500/30 font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-white/40 font-mono uppercase tracking-wider block">
                      Progresso e Atualização Inicial
                    </label>
                    <input
                      type="text"
                      placeholder="E.g., Escopo técnico definido, pronto para desenvolvimento"
                      value={newProjectProgress}
                      onChange={(e) => setNewProjectProgress(e.target.value)}
                      className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white/95 focus:outline-none focus:border-cyan-500/30 font-sans"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1 transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer"
                    >
                      <Check size={12} />
                      <span>Salvar Projeto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddProject(false)}
                      className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white/60 text-xs rounded-xl flex items-center justify-center transition-all cursor-pointer"
                    >
                      <span>Cancelar</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Projects List */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {projects.filter(p => {
                if (projectFilter === 'Todos') return true;
                return p.category === projectFilter;
              }).length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white/[0.01] rounded-2xl border border-dashed border-white/5 text-xs text-white/30 italic space-y-1">
                  <p>Nenhuma iniciativa mapeada nesta categoria.</p>
                  <p className="text-[10px] text-white/20">Sir, sinta-se à vontade para cadastrar um novo projeto.</p>
                </div>
              ) : (
                projects.filter(p => {
                  if (projectFilter === 'Todos') return true;
                  return p.category === projectFilter;
                }).map(p => {
                  const isExpanded = expandedProjects[p.id];
                  const isEditing = editingProjectId === p.id;
                  
                  // Color indicators
                  let catColor = 'text-cyan-400 border-cyan-500/20 bg-cyan-500/5';
                  let catLabel = 'Em Andamento';
                  if (p.category === 'planejamento') {
                    catColor = 'text-yellow-400 border-yellow-500/20 bg-yellow-500/5';
                    catLabel = 'Em Planejamento';
                  } else if (p.category === 'concluido') {
                    catColor = 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5';
                    catLabel = 'Concluído';
                  } else if (p.category === 'pausa') {
                    catColor = 'text-red-400 border-red-500/20 bg-red-500/5';
                    catLabel = 'Em Pausa';
                  }

                  return (
                    <div 
                      key={p.id}
                      className={`relative overflow-hidden bg-white/[0.01] border ${
                        isExpanded ? 'border-white/10 bg-black/20' : 'border-white/5 hover:border-white/10'
                      } rounded-2xl p-4 transition-all duration-300 space-y-3.5`}
                    >
                      {/* Top bar */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1 cursor-pointer flex-1" onClick={() => toggleProjectExpand(p.id)}>
                          <div className="flex items-center gap-2">
                            <span className={`text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 rounded border ${catColor}`}>
                              {catLabel}
                            </span>
                            <span className="text-[9px] font-mono text-white/40">
                              Prazo: {p.deadline}
                            </span>
                          </div>
                          <h3 className="text-xs md:text-[13px] font-bold text-white/90 tracking-wide hover:text-cyan-400 transition-colors">
                            {p.name}
                          </h3>
                        </div>

                        {/* Expand & Delete actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleProjectExpand(p.id)}
                            className="p-1.5 bg-white/[0.02] hover:bg-white/[0.08] text-white/40 hover:text-white rounded-lg transition-colors cursor-pointer"
                            title={isExpanded ? "Contrair" : "Expandir Detalhes"}
                          >
                            <ChevronRight 
                              size={12} 
                              className={`transform transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteProject(p.id)}
                            className="p-1.5 bg-white/[0.02] hover:bg-red-500/10 text-white/40 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                            title="Deletar Projeto"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Expanded Panel Details */}
                      {isExpanded && (
                        <div className="space-y-3.5 pt-3.5 border-t border-white/5 animate-fadeIn">
                          {isEditing ? (
                            /* Inline editing form */
                            <div className="space-y-3 text-xs">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-white/40 font-mono uppercase block">
                                  Nome da Iniciativa
                                </label>
                                <input
                                  type="text"
                                  value={editProjectName}
                                  onChange={(e) => setEditProjectName(e.target.value)}
                                  className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white/90 focus:outline-none"
                                />
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-white/40 font-mono uppercase block">
                                    Status
                                  </label>
                                  <select
                                    value={editProjectCategory}
                                    onChange={(e: any) => setEditProjectCategory(e.target.value)}
                                    className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-1.5 py-1 text-xs text-white/90 focus:outline-none"
                                  >
                                    <option value="andamento">Em Andamento</option>
                                    <option value="planejamento">Planejamento</option>
                                    <option value="concluido">Concluído</option>
                                    <option value="pausa">Em Pausa</option>
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold text-white/40 font-mono uppercase block">
                                    Prazo
                                  </label>
                                  <input
                                    type="date"
                                    value={editProjectDeadline}
                                    onChange={(e) => setEditProjectDeadline(e.target.value)}
                                    className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-1.5 py-1 text-xs text-white/90 focus:outline-none"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-white/40 font-mono uppercase block">
                                  Descrição
                                </label>
                                <textarea
                                  rows={2}
                                  value={editProjectDescription}
                                  onChange={(e) => setEditProjectDescription(e.target.value)}
                                  className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white/90 focus:outline-none resize-none"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-white/40 font-mono uppercase block">
                                  Objetivos e Metas
                                </label>
                                <textarea
                                  rows={2}
                                  value={editProjectObjectives}
                                  onChange={(e) => setEditProjectObjectives(e.target.value)}
                                  className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white/90 focus:outline-none resize-none"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-white/40 font-mono uppercase block">
                                  Recursos e Ferramentas
                                </label>
                                <input
                                  type="text"
                                  value={editProjectResources}
                                  onChange={(e) => setEditProjectResources(e.target.value)}
                                  className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white/90 focus:outline-none"
                                />
                              </div>

                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-white/40 font-mono uppercase block">
                                  Progresso Atual
                                </label>
                                <input
                                  type="text"
                                  value={editProjectProgress}
                                  onChange={(e) => setEditProjectProgress(e.target.value)}
                                  className="w-full bg-[#0a0d14] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white/90 focus:outline-none"
                                />
                              </div>

                              <div className="flex items-center gap-1.5 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditProject(p.id)}
                                  className="flex-1 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl text-[10px] uppercase font-mono tracking-wider cursor-pointer"
                                >
                                  Confirmar Alterações
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingProjectId(null)}
                                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-xl text-[10px] uppercase font-mono tracking-wider cursor-pointer"
                                >
                                  Descartar
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Regular details view */
                            <div className="space-y-3">
                              {/* 1. Descrição */}
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest">
                                  Descrição do Projeto
                                </span>
                                <p className="text-xs text-white/70 leading-relaxed font-sans">
                                  {p.description}
                                </p>
                              </div>

                              {/* 2. Objetivos e metas */}
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest">
                                  Objetivos & Metas
                                </span>
                                <p className="text-xs text-white/70 leading-relaxed font-sans">
                                  {p.objectives}
                                </p>
                              </div>

                              {/* 3. Recursos e ferramentas */}
                              <div className="space-y-1">
                                <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest block">
                                  Recursos & Ferramentas
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {(p.resources || '').split(',').map((r, i) => (
                                    <span 
                                      key={i} 
                                      className="text-[9px] font-mono bg-white/[0.03] border border-white/5 text-cyan-300 px-2 py-0.5 rounded-lg"
                                    >
                                      {r.trim()}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* 4. Progresso e Atualizações */}
                              <div className="space-y-0.5">
                                <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest">
                                  Progresso Atual
                                </span>
                                <p className="text-xs text-cyan-300 font-sans leading-relaxed">
                                  {p.progress}
                                </p>
                              </div>

                              {/* J.A.R.V.I.S. Actions */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
                                {onAskJarvisProject && (
                                  <button
                                    type="button"
                                    onClick={() => onAskJarvisProject(p)}
                                    className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 hover:text-white border border-cyan-500/15 rounded-xl text-[9px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer"
                                  >
                                    <Sparkles size={11} />
                                    <span>Consultar J.A.R.V.I.S.</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleStartEditProject(p)}
                                  className="px-3 py-1.5 bg-white/[0.02] hover:bg-white/[0.06] text-white/60 hover:text-white border border-white/5 rounded-xl text-[9px] font-mono font-bold tracking-wider uppercase transition-all flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit2 size={10} />
                                  <span>Editar Detalhes</span>
                                </button>
                              </div>

                              {/* Log de Atualizações - Real-time appending feed */}
                              <div className="space-y-2 pt-3 border-t border-white/5">
                                <span className="text-[9px] font-mono font-bold text-white/30 uppercase tracking-widest block">
                                  Histórico de Progresso & Logs ({p.updates.length})
                                </span>

                                {/* Quick update box */}
                                <div className="flex gap-1.5">
                                  <input
                                    type="text"
                                    placeholder="Nova atualização técnica de progresso..."
                                    value={newUpdateText[p.id] || ''}
                                    onChange={(e) => setNewUpdateText(prev => ({ ...prev, [p.id]: e.target.value }))}
                                    className="flex-1 bg-black/50 border border-white/10 rounded-xl px-2.5 py-1 text-xs text-white/90 focus:outline-none focus:border-cyan-500/20"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleAddProjectUpdate(p.id);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleAddProjectUpdate(p.id)}
                                    className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-black text-[10px] font-mono font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                                  >
                                    Log
                                  </button>
                                </div>

                                {/* Feed list */}
                                {p.updates.length > 0 && (
                                  <div className="space-y-2 max-h-[140px] overflow-y-auto scrollbar-none pr-0.5 pt-1.5">
                                    {p.updates.map(log => (
                                      <div key={log.id} className="text-[10px] leading-relaxed bg-[#0a0d14]/30 border border-white/[0.02] p-2 rounded-xl space-y-0.5">
                                        <span className="font-mono text-cyan-500 block text-[8px] font-semibold">
                                          [{log.date}] PROTOCOLO DE LOG ATIVO
                                        </span>
                                        <p className="text-white/70">{log.text}</p>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

      </div>

      {/* Persistent Alarm Modal Active Overlay */}
      {activeAlarmAlert && (
        <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4">
          <div className="max-w-sm w-full bg-[#0d0f14] border-2 border-red-500/40 rounded-2xl p-6 text-center space-y-5 shadow-[0_0_50px_rgba(239,68,68,0.3)] animate-pulse">
            <div className="mx-auto w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center text-red-400">
              <AlertTriangle size={32} className="animate-bounce" />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-bold tracking-widest text-red-400 font-mono uppercase">DISPARO NEURAL ATIVO</h2>
              <p className="text-xs text-white/50 uppercase font-semibold font-mono">Alarme: {activeAlarmAlert.label}</p>
              <p className="text-2xl font-mono text-white font-extralight tracking-widest mt-2">{activeAlarmAlert.time}</p>
            </div>
            <button
              onClick={stopAlarmAudio}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-mono text-xs font-bold tracking-widest py-3 rounded-xl cursor-pointer transition-colors"
            >
              SILENCIAR PROTOCOLO
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
