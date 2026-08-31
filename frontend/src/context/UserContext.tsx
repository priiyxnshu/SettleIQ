import React, { createContext, useContext, useState } from 'react';
import type { DemoUser, NavTab } from '../types';

export const DEMO_USERS: Record<string, DemoUser> = {
  analyst: {
    id: 'analyst',
    name: 'Priyanshu Gupta',
    role: 'OPERATIONS_ANALYST',
    roleTitle: 'Operations Analyst',
    roleCategory: 'Maker',
    initials: 'PG',
    allowedTabs: ['dashboard', 'upload'],
    description: 'Handles data ingestion and initiates reconciliation workflow'
  },
  manager: {
    id: 'manager',
    name: 'Yash Jain',
    role: 'RECONCILIATION_MANAGER',
    roleTitle: 'Reconciliation Manager',
    roleCategory: 'Checker',
    initials: 'YJ',
    allowedTabs: ['dashboard', 'reconciliation', 'exceptions', 'review', 'audit'],
    description: 'Investigates exceptions, evaluates guardrails & performs decision approvals'
  }
};

interface UserContextType {
  currentUser: DemoUser;
  switchUser: (userId: 'analyst' | 'manager') => void;
  allUsers: DemoUser[];
  hasPermission: (tab: NavTab) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Default active user is Operations Analyst (Priyanshu Gupta)
  const [currentUser, setCurrentUser] = useState<DemoUser>(() => {
    const saved = localStorage.getItem('settleiq_demo_user');
    if (saved && DEMO_USERS[saved]) {
      return DEMO_USERS[saved];
    }
    return DEMO_USERS.analyst;
  });

  const switchUser = (userId: 'analyst' | 'manager') => {
    if (DEMO_USERS[userId]) {
      setCurrentUser(DEMO_USERS[userId]);
      localStorage.setItem('settleiq_demo_user', userId);
    }
  };

  const hasPermission = (tab: NavTab): boolean => {
    return currentUser.allowedTabs.includes(tab);
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        switchUser,
        allUsers: Object.values(DEMO_USERS),
        hasPermission
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
