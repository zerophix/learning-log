/**
 * 导航状态管理 (Navigation State Management)
 * 支持层层递进的探索路径
 */

export type ViewLevel = 'tags' | 'entries' | 'detail';

export interface NavItem {
  level: ViewLevel;
  id: string | null;
  label: string;
}

export interface NavigationState {
  stack: NavItem[];
  currentView: 'graph' | 'table';
  minEnergyFilter: number;
  activeCategory: string | null;
}

// 初始状态
export const initialState: NavigationState = {
  stack: [{ level: 'tags', id: null, label: '标签总览' }],
  currentView: 'graph',
  minEnergyFilter: 1,
  activeCategory: null,
};

// 导航操作
export function navigate(state: NavigationState, level: ViewLevel, id: string, label: string): NavigationState {
  return {
    ...state,
    stack: [...state.stack, { level, id, label }],
  };
}

export function goBack(state: NavigationState): NavigationState {
  if (state.stack.length <= 1) return state;
  return {
    ...state,
    stack: state.stack.slice(0, -1),
  };
}

export function goHome(): NavigationState {
  return {
    ...initialState,
  };
}

export function getCurrent(state: NavigationState): NavItem {
  return state.stack[state.stack.length - 1];
}
