import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  deleteDoc, 
  doc, 
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';

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
 * Adiciona uma transação financeira no Firestore ou localStorage
 */
export async function addTransaction(
  userId: string, 
  tx: Omit<FinancialTransaction, 'id' | 'userId' | 'createdAt'>
): Promise<FinancialTransaction> {
  if (userId === 'demo_user') {
    const createdAt = new Date().toISOString();
    const newTx: FinancialTransaction = {
      id: 'demo_tx_' + Date.now(),
      userId,
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

  try {
    const colRef = collection(db, 'transactions');
    const createdAt = new Date().toISOString();
    const docData = {
      userId,
      description: tx.description,
      amount: Number(tx.amount),
      type: tx.type,
      category: tx.category || 'Outros',
      date: tx.date || new Date().toISOString().split('T')[0],
      createdAt,
      source: tx.source || 'manual'
    };
    
    const docRef = await addDoc(colRef, docData);
    return {
      id: docRef.id,
      ...docData
    };
  } catch (error) {
    console.error("Error adding financial transaction:", error);
    throw error;
  }
}

/**
 * Busca todas as transações de um usuário no Firestore ou localStorage
 */
export async function getTransactions(userId: string): Promise<FinancialTransaction[]> {
  if (userId === 'demo_user') {
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

  try {
    const colRef = collection(db, 'transactions');
    const q = query(
      colRef, 
      where('userId', '==', userId), 
      orderBy('date', 'desc'),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const list: FinancialTransaction[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        userId: data.userId,
        description: data.description,
        amount: data.amount,
        type: data.type,
        category: data.category,
        date: data.date,
        createdAt: data.createdAt,
        source: data.source || 'manual'
      });
    });
    return list;
  } catch (error) {
    console.error("Error getting financial transactions:", error);
    // Fallback amigável se índice do Firestore não estiver criado ainda
    try {
      const colRef = collection(db, 'transactions');
      const qSimple = query(colRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(qSimple);
      const list: FinancialTransaction[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        list.push({
          id: docSnap.id,
          userId: data.userId,
          description: data.description,
          amount: data.amount,
          type: data.type,
          category: data.category,
          date: data.date,
          createdAt: data.createdAt,
          source: data.source || 'manual'
        });
      });
      // Ordena em memória como fallback
      return list.sort((a, b) => b.date.localeCompare(a.date));
    } catch (fallbackErr) {
      console.error("Fallback transactions fetch failed too:", fallbackErr);
      throw error;
    }
  }
}

/**
 * Atualiza uma transação financeira no Firestore ou localStorage
 */
export async function updateTransaction(
  txId: string,
  tx: Partial<Omit<FinancialTransaction, 'id' | 'userId' | 'createdAt'>>
): Promise<void> {
  if (txId.startsWith('demo_tx_')) {
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
    return;
  }

  try {
    const docRef = doc(db, 'transactions', txId);
    const updateData: any = {};
    if (tx.description !== undefined) updateData.description = tx.description;
    if (tx.amount !== undefined) updateData.amount = Number(tx.amount);
    if (tx.type !== undefined) updateData.type = tx.type;
    if (tx.category !== undefined) updateData.category = tx.category;
    if (tx.date !== undefined) updateData.date = tx.date;
    if (tx.source !== undefined) updateData.source = tx.source;
    
    await updateDoc(docRef, updateData);
  } catch (error) {
    console.error("Error updating transaction:", error);
    throw error;
  }
}

/**
 * Exclui uma transação financeira do Firestore ou localStorage
 */
export async function deleteTransaction(txId: string): Promise<void> {
  if (txId.startsWith('demo_tx_')) {
    const txs = await getTransactions('demo_user');
    const filtered = txs.filter(t => t.id !== txId);
    localStorage.setItem('stark_demo_transactions', JSON.stringify(filtered));
    return;
  }

  try {
    const docRef = doc(db, 'transactions', txId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting transaction:", error);
    throw error;
  }
}

/**
 * Busca as metas financeiras de economia do usuário no Firestore ou localStorage
 */
export async function getGoals(userId: string): Promise<FinancialGoal[]> {
  if (userId === 'demo_user') {
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

  try {
    const colRef = collection(db, 'financial_goals');
    const q = query(colRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const goals: FinancialGoal[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      goals.push({
        id: docSnap.id,
        userId: data.userId,
        title: data.title,
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount,
        deadline: data.deadline
      });
    });
    return goals;
  } catch (error) {
    console.error("Error fetching financial goals:", error);
    return [];
  }
}

/**
 * Salva ou atualiza uma meta de economia do usuário no Firestore ou localStorage
 */
export async function saveGoal(userId: string, goal: Omit<FinancialGoal, 'userId'>): Promise<FinancialGoal> {
  if (userId === 'demo_user') {
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
      id: 'demo_goal_' + Date.now(),
      userId,
      title: goal.title,
      targetAmount: Number(goal.targetAmount),
      currentAmount: Number(goal.currentAmount),
      deadline: goal.deadline || ''
    };
    goals.push(newGoal);
    localStorage.setItem('stark_demo_goals', JSON.stringify(goals));
    return newGoal;
  }

  try {
    const colRef = collection(db, 'financial_goals');
    if (goal.id && !goal.id.startsWith('temp_')) {
      const docRef = doc(db, 'financial_goals', goal.id);
      const updatedData = {
        title: goal.title,
        targetAmount: Number(goal.targetAmount),
        currentAmount: Number(goal.currentAmount),
        deadline: goal.deadline || ''
      };
      await updateDoc(docRef, updatedData);
      return {
        id: goal.id,
        userId,
        ...updatedData
      };
    } else {
      const docData = {
        userId,
        title: goal.title,
        targetAmount: Number(goal.targetAmount),
        currentAmount: Number(goal.currentAmount),
        deadline: goal.deadline || ''
      };
      const docRef = await addDoc(colRef, docData);
      return {
        id: docRef.id,
        userId,
        ...docData
      };
    }
  } catch (error) {
    console.error("Error saving financial goal:", error);
    throw error;
  }
}

/**
 * Exclui uma meta financeira no Firestore ou localStorage
 */
export async function deleteGoal(goalId: string): Promise<void> {
  if (goalId.startsWith('demo_goal_')) {
    const goals = await getGoals('demo_user');
    const filtered = goals.filter(g => g.id !== goalId);
    localStorage.setItem('stark_demo_goals', JSON.stringify(filtered));
    return;
  }

  try {
    const docRef = doc(db, 'financial_goals', goalId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error("Error deleting financial goal:", error);
    throw error;
  }
}
