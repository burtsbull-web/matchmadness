import type { TabName } from './types'

export type IconName = 'trophy' | 'list' | 'book' | 'edit' | 'upload'

export interface TabDef {
  key: TabName
  label: string
  mobileLabel: string
  icon: IconName
  adminOnly: boolean
}

export const TABS: TabDef[] = [
  { key: 'bracket', label: 'Bracket', mobileLabel: 'Bracket', icon: 'trophy', adminOnly: false },
  { key: 'leaderboard', label: 'Leaderboard', mobileLabel: 'Rankings', icon: 'list', adminOnly: false },
  { key: 'rules', label: 'Scoring Rules', mobileLabel: 'Rules', icon: 'book', adminOnly: false },
  { key: 'score', label: 'Enter Scores', mobileLabel: 'Scores', icon: 'edit', adminOnly: true },
  { key: 'import', label: 'Import Teams', mobileLabel: 'Import', icon: 'upload', adminOnly: true },
]

export function selectTab(
  key: TabName,
  auth: { isAdmin: boolean; requireAdmin: (cb: () => void) => void },
  store: { activeTab: TabName },
): void {
  const def = TABS.find(t => t.key === key)
  if (def?.adminOnly && !auth.isAdmin) {
    auth.requireAdmin(() => { store.activeTab = key })
    return
  }
  store.activeTab = key
}
