export interface FinancialTransaction {
  id: string;
  userId: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string; // YYYY-MM-DD
  createdAt: string; // ISO String
  source?: 'chat' | 'manual';
}

export interface FinancialGoal {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string; // YYYY-MM-DD
}

/**
 * Adiciona uma transação financeira no localStorage
 */
export async function addTransaction(
  userId: string, 
  tx: Omit<FinancialTransaction, 'id' | 'userId' | 'createdAt'>
): Promise<FinancialTransaction> {
  const createdAt = new Date().toISOString();
  const newTx: FinancialTransaction = {
    id: 'demo_tx_' + Date.now() + Math.random().toString(36).substr(2, 5),
    userId: 'demo_user',
    description: tx.description,
    amount: Number(tx.amount),
    type: tx.type,
    category: tx.category || 'Outros',
    date: tx.date || new Date().toISOString().split('T')[0],
    createdAt,
    source: tx.source || 'manual'
  };
  
  const txs = await getTransactions('demo_user');
  txs.unshift(newTx);
  localStorage.setItem('stark_demo_transactions', JSON.stringify(txs));
  return newTx;
}

/**
 * Busca todas as transações do usuário no localStorage
 */
export async function getTransactions(userId: string): Promise<FinancialTransaction[]> {
  const stored = localStorage.getItem('stark_demo_transactions');
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Seed default Stark data if empty
  const defaultTxs: FinancialTransaction[] = [
    {
      id: 'demo_tx_1',
      userId: 'demo_user',
      description: 'Aporte de Capital Stark Industries',
      amount: 25000,
      type: 'income',
      category: 'Investimentos',
      date: new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      source: 'manual'
    },
    {
      id: 'demo_tx_2',
      userId: 'demo_user',
      description: 'Royalties de Patentes (Reator Arc)',
      amount: 42000,
      type: 'income',
      category: 'Royalties',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      source: 'manual'
    },
    {
      id: 'demo_tx_3',
      userId: 'demo_user',
      description: 'Manutenção de Servidores J.A.R.V.I.S.',
      amount: 5400,
      type: 'expense',
      category: 'Infraestrutura',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      source: 'manual'
    },
    {
      id: 'demo_tx_4',
      userId: 'demo_user',
      description: 'Peças de Reposição - Mark 85',
      amount: 12500,
      type: 'expense',
      category: 'Projetos',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      source: 'manual'
    },
    {
      id: 'demo_tx_5',
      userId: 'demo_user',
      description: 'Assinatura Premium de Supercomputador',
      amount: 850,
      type: 'expense',
      category: 'Serviços',
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      source: 'manual'
    }
  ];
  localStorage.setItem('stark_demo_transactions', JSON.stringify(defaultTxs));
  return defaultTxs;
}

/**
 * Atualiza uma transação financeira no localStorage
 */
export async function updateTransaction(
  txId: string,
  tx: Partial<Omit<FinancialTransaction, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  const txs = await getTransactions('demo_user');
  const index = txs.findIndex(t => t.id === txId);
  if (index !== -1) {
    txs[index] = {
      ...txs[index],
      ...tx,
      amount: tx.amount !== undefined ? Number(tx.amount) : txs[index].amount
    };
    localStorage.setItem('stark_demo_transactions', JSON.stringify(txs));
  }
}

/**
 * Exclui uma transação financeira do localStorage
 */
export async function deleteTransaction(txId: string): Promise<void> {
  const txs = await getTransactions('demo_user');
  const filtered = txs.filter(t => t.id !== txId);
  localStorage.setItem('stark_demo_transactions', JSON.stringify(filtered));
}

/**
 * Busca as metas financeiras de economia do usuário no localStorage
 */
export async function getGoals(userId: string): Promise<FinancialGoal[]> {
  const stored = localStorage.getItem('stark_demo_goals');
  if (stored) {
    return JSON.parse(stored);
  }
  
  // Seed default Stark goals
  const defaultGoals: FinancialGoal[] = [
    {
      id: 'demo_goal_1',
      userId: 'demo_user',
      title: 'Reator Arc Portátil (Próxima Geração)',
      targetAmount: 50000,
      currentAmount: 35000,
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    },
    {
      id: 'demo_goal_2',
      userId: 'demo_user',
      title: 'Upgrade da Sala Holográfica Stark',
      targetAmount: 150000,
      currentAmount: 95000,
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  ];
  localStorage.setItem('stark_demo_goals', JSON.stringify(defaultGoals));
  return defaultGoals;
}

/**
 * Salva ou atualiza uma meta de economia do usuário no localStorage
 */
export async function saveGoal(userId: string, goal: Omit<FinancialGoal, 'userId'>): Promise<FinancialGoal> {
  const goals = await getGoals('demo_user');
  if (goal.id && goal.id.startsWith('demo_goal_')) {
    const index = goals.findIndex(g => g.id === goal.id);
    if (index !== -1) {
      goals[index] = {
        ...goals[index],
        title: goal.title,
        targetAmount: Number(goal.targetAmount),
        currentAmount: Number(goal.currentAmount),
        deadline: goal.deadline || ''
      };
      localStorage.setItem('stark_demo_goals', JSON.stringify(goals));
      return goals[index];
    }
  }
  
  // Create new
  const newGoal: FinancialGoal = {
    id: 'demo_goal_' + Date.now() + Math.random().toString(36).substr(2, 5),
    userId: 'demo_user',
    title: goal.title,
    targetAmount: Number(goal.targetAmount),
    currentAmount: Number(goal.currentAmount),
    deadline: goal.deadline || ''
  };
  goals.push(newGoal);
  localStorage.setItem('stark_demo_goals', JSON.stringify(goals));
  return newGoal;
}

/**
 * Exclui uma meta financeira no localStorage
 */
export async function deleteGoal(goalId: string): Promise<void> {
  const goals = await getGoals('demo_user');
  const filtered = goals.filter(g => g.id !== goalId);
  localStorage.setItem('stark_demo_goals', JSON.stringify(filtered));
}
