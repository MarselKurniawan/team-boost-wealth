// Demo data store using localStorage

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  vipLevel: number;
  balance: number;
  referralCode: string;
  referredBy: string | null;
  totalIncome: number;
  totalRecharge: number;
  totalInvest: number;
  totalWithdraw: number;
  totalRabat: number;
  teamIncome: number;
  createdAt: string;
  isAdmin: boolean;
}

export interface Investment {
  id: string;
  userId: string;
  productId: number;
  productName: string;
  amount: number;
  dailyIncome: number;
  validity: number;
  daysRemaining: number;
  totalEarned: number;
  status: 'active' | 'completed';
  createdAt: string;
  lastClaimedAt?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'recharge' | 'withdraw' | 'invest' | 'income' | 'commission';
  amount: number;
  status: 'pending' | 'success' | 'rejected';
  date: string;
  description?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  vipLevel: number;
  totalEarnings: number;
  status: 'active' | 'pending';
  joinedAt: string;
}

export interface Product {
  id: number;
  name: string;
  series: string;
  model: string;
  price: number;
  dailyIncome: number;
  validity: number;
  totalIncome: number;
  vipLevel: number;
  image: string;
  description: string;
  totalStock: number;
  availableStock: number;
}

// Commission rates based on VIP level
export const getCommissionRate = (vipLevel: number): number => {
  const rates: Record<number, number> = {
    1: 0.01,  // 1%
    2: 0.03,  // 3%
    3: 0.05,  // 5%
    4: 0.08,  // 8%
    5: 0.10,  // 10%
  };
  return rates[vipLevel] || 0.01;
};

// Generate unique referral code
export const generateReferralCode = (): string => {
  return 'REF' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Generate unique ID
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

// Get current user
export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem('demoUser');
  return stored ? JSON.parse(stored) : null;
};

// Save user
export const saveUser = (user: User): void => {
  localStorage.setItem('demoUser', JSON.stringify(user));
};

// Get all users (for admin)
export const getAllUsers = (): User[] => {
  const stored = localStorage.getItem('allUsers');
  return stored ? JSON.parse(stored) : [];
};

// Save all users
export const saveAllUsers = (users: User[]): void => {
  localStorage.setItem('allUsers', JSON.stringify(users));
};

// Update user by ID (for admin and commission)
export const updateUserById = (userId: string, updates: Partial<User>): void => {
  const allUsers = getAllUsers();
  const idx = allUsers.findIndex(u => u.id === userId);
  if (idx !== -1) {
    allUsers[idx] = { ...allUsers[idx], ...updates };
    saveAllUsers(allUsers);
    
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      saveUser(allUsers[idx]);
    }
  }
};

// Add commission to referrer when downline invests
export const processReferralCommission = (investorId: string, investAmount: number): void => {
  const allUsers = getAllUsers();
  const investor = allUsers.find(u => u.id === investorId);
  
  if (!investor || !investor.referredBy) return;
  
  const referrer = allUsers.find(u => u.referralCode === investor.referredBy);
  if (!referrer) return;
  
  const commissionRate = getCommissionRate(referrer.vipLevel);
  const commission = Math.floor(investAmount * commissionRate);
  
  // Update referrer balance and stats
  const referrerIdx = allUsers.findIndex(u => u.id === referrer.id);
  allUsers[referrerIdx].balance += commission;
  allUsers[referrerIdx].teamIncome += commission;
  allUsers[referrerIdx].totalIncome += commission;
  saveAllUsers(allUsers);
  
  // Add commission transaction for referrer
  const transactions = getTransactions(referrer.id);
  transactions.unshift({
    id: generateId(),
    userId: referrer.id,
    type: 'commission',
    amount: commission,
    status: 'success',
    date: new Date().toISOString(),
    description: `Komisi ${(commissionRate * 100).toFixed(0)}% dari investasi ${investor.name}`,
  });
  saveTransactions(referrer.id, transactions);
  
  // Update team member earnings
  const teamMembers = getTeamMembers(referrer.id);
  const memberIdx = teamMembers.findIndex(m => m.id === investorId);
  if (memberIdx !== -1) {
    teamMembers[memberIdx].totalEarnings += commission;
    saveTeamMembers(referrer.id, teamMembers);
  }
  
  // Update current user if they are the referrer
  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === referrer.id) {
    saveUser(allUsers[referrerIdx]);
  }
};

// Register new user
export const registerUser = (name: string, email: string, password: string, referredBy?: string): User => {
  const allUsers = getAllUsers();
  
  const newUser: User = {
    id: generateId(),
    email,
    name,
    phone: '',
    vipLevel: 1,
    balance: 0,
    referralCode: generateReferralCode(),
    referredBy: referredBy || null,
    totalIncome: 0,
    totalRecharge: 0,
    totalInvest: 0,
    totalWithdraw: 0,
    totalRabat: 0,
    teamIncome: 0,
    createdAt: new Date().toISOString(),
    isAdmin: allUsers.length === 0, // First user is admin
  };

  allUsers.push(newUser);
  saveAllUsers(allUsers);
  saveUser(newUser);

  // Update referrer if exists
  if (referredBy) {
    const referrer = allUsers.find(u => u.referralCode === referredBy);
    if (referrer) {
      const teamMembers = getTeamMembers(referrer.id);
      teamMembers.push({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        vipLevel: newUser.vipLevel,
        totalEarnings: 0,
        status: 'active',
        joinedAt: newUser.createdAt,
      });
      saveTeamMembers(referrer.id, teamMembers);
      
      // Update VIP level based on referrals
      updateVipLevel(referrer.id);
    }
  }

  return newUser;
};

// Login user
export const loginUser = (email: string, password: string): User | null => {
  const allUsers = getAllUsers();
  const user = allUsers.find(u => u.email === email);
  if (user) {
    saveUser(user);
    return user;
  }
  return null;
};

// Update user balance and stats
export const updateUser = (updates: Partial<User>): User | null => {
  const user = getCurrentUser();
  if (!user) return null;

  const updatedUser = { ...user, ...updates };
  saveUser(updatedUser);

  // Update in allUsers too
  const allUsers = getAllUsers();
  const idx = allUsers.findIndex(u => u.id === user.id);
  if (idx !== -1) {
    allUsers[idx] = updatedUser;
    saveAllUsers(allUsers);
  }

  return updatedUser;
};

// Get user investments
export const getInvestments = (userId: string): Investment[] => {
  const stored = localStorage.getItem(`investments_${userId}`);
  return stored ? JSON.parse(stored) : [];
};

// Save investments
export const saveInvestments = (userId: string, investments: Investment[]): void => {
  localStorage.setItem(`investments_${userId}`, JSON.stringify(investments));
};

// Add investment
export const addInvestment = (investment: Omit<Investment, 'id' | 'createdAt'>): Investment => {
  const user = getCurrentUser();
  if (!user) throw new Error('User not found');

  const newInvestment: Investment = {
    ...investment,
    id: generateId(),
    createdAt: new Date().toISOString(),
  };

  const investments = getInvestments(user.id);
  investments.push(newInvestment);
  saveInvestments(user.id, investments);

  // Process referral commission
  processReferralCommission(user.id, investment.amount);

  return newInvestment;
};

// Check if investment can be claimed today
export const canClaimToday = (investment: Investment): boolean => {
  if (investment.status !== 'active' || investment.daysRemaining <= 0) return false;
  
  if (!investment.lastClaimedAt) return true;
  
  const lastClaimed = new Date(investment.lastClaimedAt);
  const today = new Date();
  
  // Reset at midnight
  return lastClaimed.toDateString() !== today.toDateString();
};

// Claim daily income for an investment
export const claimDailyIncome = (investmentId: string): { success: boolean; amount: number } => {
  const user = getCurrentUser();
  if (!user) return { success: false, amount: 0 };

  const investments = getInvestments(user.id);
  const invIdx = investments.findIndex(i => i.id === investmentId);
  
  if (invIdx === -1) return { success: false, amount: 0 };
  
  const investment = investments[invIdx];
  
  if (!canClaimToday(investment)) return { success: false, amount: 0 };
  
  const dailyIncome = investment.dailyIncome;
  
  // Update investment
  investments[invIdx].lastClaimedAt = new Date().toISOString();
  investments[invIdx].totalEarned += dailyIncome;
  investments[invIdx].daysRemaining -= 1;
  
  // Check if investment is completed
  if (investments[invIdx].daysRemaining <= 0) {
    investments[invIdx].status = 'completed';
  }
  
  saveInvestments(user.id, investments);
  
  // Update user balance and stats
  const updatedUser = {
    ...user,
    balance: user.balance + dailyIncome,
    totalIncome: user.totalIncome + dailyIncome,
  };
  saveUser(updatedUser);
  
  // Update in allUsers
  const allUsers = getAllUsers();
  const userIdx = allUsers.findIndex(u => u.id === user.id);
  if (userIdx !== -1) {
    allUsers[userIdx] = updatedUser;
    saveAllUsers(allUsers);
  }
  
  // Add income transaction
  addTransaction({
    userId: user.id,
    type: 'income',
    amount: dailyIncome,
    status: 'success',
    description: `Penghasilan harian dari ${investment.productName}`,
  });
  
  return { success: true, amount: dailyIncome };
};

// Get transactions
export const getTransactions = (userId: string): Transaction[] => {
  const stored = localStorage.getItem(`transactions_${userId}`);
  return stored ? JSON.parse(stored) : [];
};

// Save transactions
export const saveTransactions = (userId: string, transactions: Transaction[]): void => {
  localStorage.setItem(`transactions_${userId}`, JSON.stringify(transactions));
};

// Add transaction
export const addTransaction = (transaction: Omit<Transaction, 'id' | 'date'>): Transaction => {
  const user = getCurrentUser();
  if (!user) throw new Error('User not found');

  const newTransaction: Transaction = {
    ...transaction,
    id: generateId(),
    date: new Date().toISOString(),
  };

  const transactions = getTransactions(user.id);
  transactions.unshift(newTransaction);
  saveTransactions(user.id, transactions);

  return newTransaction;
};

// Get team members
export const getTeamMembers = (userId: string): TeamMember[] => {
  const stored = localStorage.getItem(`team_${userId}`);
  return stored ? JSON.parse(stored) : [];
};

// Save team members
export const saveTeamMembers = (userId: string, members: TeamMember[]): void => {
  localStorage.setItem(`team_${userId}`, JSON.stringify(members));
};

// Update VIP level based on referrals
export const updateVipLevel = (userId: string): void => {
  const allUsers = getAllUsers();
  const userIdx = allUsers.findIndex(u => u.id === userId);
  if (userIdx === -1) return;

  const teamMembers = getTeamMembers(userId);
  const count = teamMembers.length;

  let newVipLevel = 1;
  if (count >= 50) newVipLevel = 5;
  else if (count >= 30) newVipLevel = 4;
  else if (count >= 15) newVipLevel = 3;
  else if (count >= 5) newVipLevel = 2;

  allUsers[userIdx].vipLevel = newVipLevel;
  saveAllUsers(allUsers);

  const currentUser = getCurrentUser();
  if (currentUser && currentUser.id === userId) {
    saveUser({ ...currentUser, vipLevel: newVipLevel });
  }
};

// Get pending transactions (for admin)
export const getAllPendingTransactions = (): (Transaction & { userName: string; userEmail: string })[] => {
  const allUsers = getAllUsers();
  const pending: (Transaction & { userName: string; userEmail: string })[] = [];

  allUsers.forEach(user => {
    const transactions = getTransactions(user.id);
    transactions.forEach(t => {
      if (t.status === 'pending') {
        pending.push({ ...t, userName: user.name, userEmail: user.email });
      }
    });
  });

  return pending.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

// Approve/reject transaction (admin)
export const updateTransactionStatus = (userId: string, transactionId: string, status: 'success' | 'rejected'): void => {
  console.log('updateTransactionStatus called:', { userId, transactionId, status });
  
  const transactions = getTransactions(userId);
  console.log('Found transactions for user:', transactions.length);
  
  const txIdx = transactions.findIndex(t => t.id === transactionId);
  console.log('Transaction index:', txIdx);
  
  if (txIdx === -1) {
    console.log('Transaction not found!');
    return;
  }

  const tx = transactions[txIdx];
  console.log('Original transaction:', tx);
  
  // Create updated transaction with new status
  transactions[txIdx] = { ...tx, status };
  console.log('Updated transaction:', transactions[txIdx]);
  
  // Save updated transactions
  saveTransactions(userId, transactions);
  console.log('Transactions saved');

  if (status === 'success') {
    const allUsers = getAllUsers();
    const userIdx = allUsers.findIndex(u => u.id === userId);
    if (userIdx !== -1) {
      const user = { ...allUsers[userIdx] };
      if (tx.type === 'recharge') {
        user.balance += tx.amount;
        user.totalRecharge += tx.amount;
      } else if (tx.type === 'withdraw') {
        user.totalWithdraw += tx.amount;
      }
      allUsers[userIdx] = user;
      saveAllUsers(allUsers);
      console.log('User updated:', user);

      const currentUser = getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        saveUser(user);
      }
    }
  } else if (status === 'rejected' && tx.type === 'withdraw') {
    // Refund balance if withdraw is rejected
    const allUsers = getAllUsers();
    const userIdx = allUsers.findIndex(u => u.id === userId);
    if (userIdx !== -1) {
      allUsers[userIdx] = { ...allUsers[userIdx], balance: allUsers[userIdx].balance + tx.amount };
      saveAllUsers(allUsers);

      const currentUser = getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        saveUser(allUsers[userIdx]);
      }
    }
  }
};

// Get income statistics for charts
export const getIncomeStats = (userId: string): { date: string; income: number; commission: number }[] => {
  const transactions = getTransactions(userId);
  const stats: Record<string, { income: number; commission: number }> = {};
  
  // Get last 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    stats[dateStr] = { income: 0, commission: 0 };
  }
  
  transactions.forEach(tx => {
    if (tx.status !== 'success') return;
    const dateStr = tx.date.split('T')[0];
    if (stats[dateStr]) {
      if (tx.type === 'income') {
        stats[dateStr].income += tx.amount;
      } else if (tx.type === 'commission') {
        stats[dateStr].commission += tx.amount;
      }
    }
  });
  
  return Object.entries(stats).map(([date, data]) => ({
    date: new Date(date).toLocaleDateString('id-ID', { weekday: 'short' }),
    ...data,
  }));
};

// Get investment distribution for charts
export const getInvestmentDistribution = (userId: string): { name: string; value: number }[] => {
  const investments = getInvestments(userId);
  const distribution: Record<string, number> = {};
  
  investments.forEach(inv => {
    if (!distribution[inv.productName]) {
      distribution[inv.productName] = 0;
    }
    distribution[inv.productName] += inv.amount;
  });
  
  return Object.entries(distribution).map(([name, value]) => ({ name, value }));
};

// Get all products with images
export const getAllProducts = (): Product[] => [
  { 
    id: 1, 
    name: "PowerVault AA", 
    series: "A Series Starter",
    model: "CV-ESS-001S",
    price: 150000, 
    dailyIncome: 15000, 
    validity: 20, 
    totalIncome: 300000, 
    vipLevel: 1,
    image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&h=300&fit=crop",
    description: "Cocok untuk pemula yang ingin memulai investasi",
    totalStock: 1000,
    availableStock: 847,
  },
  { 
    id: 2, 
    name: "PowerVault AB", 
    series: "A Series Basic",
    model: "CV-ESS-002B",
    price: 300000, 
    dailyIncome: 33000, 
    validity: 20, 
    totalIncome: 660000, 
    vipLevel: 1,
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=300&fit=crop",
    description: "Investasi dasar dengan return yang menarik",
    totalStock: 900,
    availableStock: 774,
  },
  { 
    id: 3, 
    name: "PowerVault Pro", 
    series: "B Series Period",
    model: "CV-ESS-100S",
    price: 500000, 
    dailyIncome: 55000, 
    validity: 20, 
    totalIncome: 1100000, 
    vipLevel: 1,
    image: "https://images.unsplash.com/photo-1642790106117-e829e14a795f?w=400&h=300&fit=crop",
    description: "Untuk investor yang siap naik level",
    totalStock: 800,
    availableStock: 623,
  },
  { 
    id: 4, 
    name: "Premium Alpha", 
    series: "C Series Premium",
    model: "CV-PRE-200A",
    price: 1000000, 
    dailyIncome: 115000, 
    validity: 20, 
    totalIncome: 2300000, 
    vipLevel: 2,
    image: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=300&fit=crop",
    description: "Paket premium dengan keuntungan maksimal",
    totalStock: 600,
    availableStock: 412,
  },
  { 
    id: 5, 
    name: "Premium Beta", 
    series: "C Series Premium",
    model: "CV-PRE-200B",
    price: 2000000, 
    dailyIncome: 240000, 
    validity: 20, 
    totalIncome: 4800000, 
    vipLevel: 2,
    image: "https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400&h=300&fit=crop",
    description: "Double keuntungan untuk member premium",
    totalStock: 500,
    availableStock: 289,
  },
  { 
    id: 6, 
    name: "Elite Gold", 
    series: "D Series Elite",
    model: "CV-ELT-300G",
    price: 5000000, 
    dailyIncome: 625000, 
    validity: 20, 
    totalIncome: 12500000, 
    vipLevel: 3,
    image: "https://images.unsplash.com/photo-1610375461246-83df859d849d?w=400&h=300&fit=crop",
    description: "Eksklusif untuk member elite",
    totalStock: 400,
    availableStock: 156,
  },
  { 
    id: 7, 
    name: "Elite Platinum", 
    series: "D Series Elite",
    model: "CV-ELT-300P",
    price: 10000000, 
    dailyIncome: 1300000, 
    validity: 20, 
    totalIncome: 26000000, 
    vipLevel: 3,
    image: "https://images.unsplash.com/photo-1624365168968-f283d506c6b6?w=400&h=300&fit=crop",
    description: "Platinum grade investment package",
    totalStock: 300,
    availableStock: 98,
  },
  { 
    id: 8, 
    name: "Diamond Core", 
    series: "E Series Diamond",
    model: "CV-DIA-400C",
    price: 25000000, 
    dailyIncome: 3500000, 
    validity: 20, 
    totalIncome: 70000000, 
    vipLevel: 4,
    image: "https://images.unsplash.com/photo-1515606378517-3451a4fa2e12?w=400&h=300&fit=crop",
    description: "Diamond tier dengan return fantastis",
    totalStock: 200,
    availableStock: 67,
  },
  { 
    id: 9, 
    name: "Diamond Plus", 
    series: "E Series Diamond",
    model: "CV-DIA-400P",
    price: 50000000, 
    dailyIncome: 7500000, 
    validity: 20, 
    totalIncome: 150000000, 
    vipLevel: 4,
    image: "https://images.unsplash.com/photo-1639762681057-408e52192e55?w=400&h=300&fit=crop",
    description: "Premium diamond untuk investor serius",
    totalStock: 150,
    availableStock: 34,
  },
  { 
    id: 10, 
    name: "Ultimate Titan", 
    series: "F Series Ultimate",
    model: "CV-ULT-500T",
    price: 100000000, 
    dailyIncome: 16000000, 
    validity: 20, 
    totalIncome: 320000000, 
    vipLevel: 5,
    image: "https://images.unsplash.com/photo-1620321023374-d1a68fbc720d?w=400&h=300&fit=crop",
    description: "Ultimate package dengan return maksimal",
    totalStock: 100,
    availableStock: 12,
  },
];

// Format currency
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};
