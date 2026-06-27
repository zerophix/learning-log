/**
 * SVG 图标组件库
 * 统一管理所有图标，禁止使用 emoji
 */

import React from 'react';

// 图标基础属性
interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

// 默认颜色
const DEFAULT_COLOR = '#38bdf8';

// ==================== 导航图标 ====================

export function IconBook({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M4 19.5V4.5C4 3.67157 4.67157 3 5.5 3H18.5C19.3284 3 20 3.67157 20 4.5V19.5C20 20.3284 19.3284 21 18.5 21H5.5C4.67157 21 4 20.3284 4 19.5Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 7H16" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 11H14" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 15H12" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function IconNetwork({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={color} strokeWidth="1.5"/>
      <circle cx="5" cy="6" r="2" stroke={color} strokeWidth="1.5"/>
      <circle cx="19" cy="6" r="2" stroke={color} strokeWidth="1.5"/>
      <circle cx="5" cy="18" r="2" stroke={color} strokeWidth="1.5"/>
      <circle cx="19" cy="18" r="2" stroke={color} strokeWidth="1.5"/>
      <path d="M7 7L10 10" stroke={color} strokeWidth="1.5"/>
      <path d="M17 7L14 10" stroke={color} strokeWidth="1.5"/>
      <path d="M7 17L10 14" stroke={color} strokeWidth="1.5"/>
      <path d="M17 17L14 14" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}

export function IconList({ size = 24, color = DEFAULT_COLOR }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="4" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="3" y="10" width="18" height="4" rx="1" stroke={color} strokeWidth="1.5"/>
      <rect x="3" y="16" width="18" height="4" rx="1" stroke={color} strokeWidth="1.5"/>
    </svg>
  );
}

// ==================== 状态图标 ====================

export function IconLightbulb({ size = 16, color = '#fbbf24' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M9 18H15M10 22H14M12 2C8.13 2 5 5.13 5 9C5 11.38 6.19 13.47 8 14.74V17H16V14.74C17.81 13.47 19 11.38 19 9C19 5.13 15.87 2 12 2Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconHourglass({ size = 20, color = '#64748b' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M5 3H19M5 21H19M6 3V8L12 12L6 16V21M18 3V8L12 12L18 16V21" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconEmpty({ size = 64, color = '#475569' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ opacity: 0.3 }}>
      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 17L12 22L22 17" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12L12 17L22 12" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ==================== 操作图标 ====================

export function IconSearch({ size = 20, color = '#64748b' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="11" cy="11" r="8" stroke={color} strokeWidth="1.5"/>
      <path d="M21 21L16.65 16.65" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function IconPlus({ size = 20, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 5V19M5 12H19" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function IconClose({ size = 18, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6L18 18" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function IconEdit({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M11 4H4C3.44772 4 3 4.44772 3 5V20C3 20.5523 3.44772 21 4 21H19C19.5523 21 20 20.5523 20 20V13" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M18.5 2.50001C18.8978 2.10219 18.8978 1.45782 18.5 1.06001L16.9393 -0.500686C16.5415 -0.898505 15.8971 -0.898505 15.4993 -0.500686L7 7.99933V11H10L18.5 2.50001Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconDelete({ size = 16, color = 'currentColor' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M3 6H5H21" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M8 6V4C8 3.44772 8.44772 3 9 3H15C15.5523 3 16 3.44772 16 4V6M19 6V20C19 20.5523 18.5523 21 18 21H6C5.44772 21 5 20.5523 5 20V6" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ==================== 标签图标 ====================

export function IconTag({ size = 12, color = '#64748b' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M7 7H7.01M7 3H5C4.46957 3 3.96086 3.21071 3.58579 3.58579C3.21071 3.96086 3 4.46957 3 5V7M17 7H17.01M7 17H7.01M17 17H17.01M17 21H19C19.5304 21 20.0391 20.7893 20.4142 20.4142C20.7893 20.0391 21 19.5304 21 19V17M12 12H12.01M7 12H7.01M17 12H17.01M12 7H12.01M12 17H12.01" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ==================== 警告图标 ====================

export function IconWarning({ size = 16, color = '#ef4444' }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 9V13M12 17H12.01M10.29 3.86L1.82 18C1.64 18.3 1.55 18.64 1.55 18.98C1.55 19.32 1.64 19.66 1.82 19.96C2 20.26 2.26 20.51 2.57 20.69C2.88 20.87 3.23 20.97 3.59 20.97H20.41C20.77 20.97 21.12 20.87 21.43 20.69C21.74 20.51 22 20.26 22.18 19.96C22.36 19.66 22.45 19.32 22.45 18.98C22.45 18.64 22.36 18.3 22.18 18L13.71 3.86C13.53 3.56 13.27 3.32 12.96 3.14C12.65 2.96 12.3 2.86 11.94 2.86C11.58 2.86 11.23 2.96 10.92 3.14C10.61 3.32 10.35 3.56 10.17 3.86L10.29 3.86Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ==================== 加载图标 ====================

export function IconLoader({ size = 20, color = '#64748b', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite', ...style }}>
      <path d="M12 2V4M12 20V22M4 12H2M22 12H20M6.34 6.34L4.93 4.93M19.07 19.07L17.66 17.66M6.34 17.66L4.93 19.07M19.07 4.93L17.66 6.34" stroke={color} strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

// ==================== 图标映射表 ====================

export const ICONS = {
  book: IconBook,
  network: IconNetwork,
  list: IconList,
  lightbulb: IconLightbulb,
  hourglass: IconHourglass,
  empty: IconEmpty,
  search: IconSearch,
  plus: IconPlus,
  close: IconClose,
  edit: IconEdit,
  delete: IconDelete,
  tag: IconTag,
  warning: IconWarning,
  loader: IconLoader,
} as const;

export type IconName = keyof typeof ICONS;
