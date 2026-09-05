import type { DemoUser } from '../types';

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
    allowedTabs: ['dashboard', 'reconciliation', 'exceptions', 'review', 'audit', 'reports'],
    description: 'Investigates exceptions, evaluates guardrails & performs decision approvals'
  }
};
