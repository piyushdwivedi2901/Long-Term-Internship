import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

type Loader = () => Promise<{ default: ComponentType }>

export interface TaskEntry {
  id: string
  num: number
  title: string
  /** Lazy component: each task is its own chunk, fetched on first visit. */
  Component: LazyExoticComponent<ComponentType>
  /** Warm the chunk (e.g. on hover/focus) so navigation feels instant. */
  preload: () => void
}

export interface DayEntry {
  day: number
  label: string
  tasks: TaskEntry[]
}

interface RawTask {
  id: string
  num: number
  title: string
  load: Loader
}
interface RawDay {
  day: number
  label: string
  tasks: RawTask[]
}

export const ROADMAP_TOTAL = 41

// Registry of every task. Each entry drives the sidebar nav, the breadcrumb
// header, deep links and the progress bar — add a day here and everything
// downstream updates automatically. Tasks are loaded with dynamic import()
// so the entry bundle only contains the shell (Task 40/41: this removed ~140 kB
// of unused JavaScript from first load).
const rawRegistry: RawDay[] = [
  { day: 1, label: 'Day 1', tasks: [
    { id: 'd1-t1', num: 1, title: 'Static Profile Card', load: () => import('./days/day01/Task1_StaticProfileCard') },
    { id: 'd1-t2', num: 2, title: 'Props Practice', load: () => import('./days/day01/Task2_PropsPractice') },
  ]},
  { day: 2, label: 'Day 2', tasks: [
    { id: 'd2-t3', num: 3, title: 'List Rendering', load: () => import('./days/day02/Task3_ListRendering') },
    { id: 'd2-t4', num: 4, title: 'Conditional Rendering', load: () => import('./days/day02/Task4_ConditionalRendering') },
  ]},
  { day: 3, label: 'Day 3', tasks: [
    { id: 'd3-t5', num: 5, title: 'Counter App', load: () => import('./days/day03/Task5_CounterApp') },
    { id: 'd3-t6', num: 6, title: 'Toggle Switch', load: () => import('./days/day03/Task6_ToggleSwitch') },
  ]},
  { day: 4, label: 'Day 4', tasks: [
    { id: 'd4-t7', num: 7, title: 'Simple Form', load: () => import('./days/day04/Task7_SimpleForm') },
    { id: 'd4-t8', num: 8, title: 'To-Do List', load: () => import('./days/day04/Task8_TodoList') },
  ]},
  { day: 5, label: 'Day 5', tasks: [
    { id: 'd5-t9', num: 9, title: 'useEffect Basics', load: () => import('./days/day05/Task9_UseEffectBasics') },
    { id: 'd5-t10', num: 10, title: 'Fetch API Data', load: () => import('./days/day05/Task10_FetchApiData') },
  ]},
  { day: 6, label: 'Day 6', tasks: [
    { id: 'd6-t11', num: 11, title: 'Search/Filter', load: () => import('./days/day06/Task11_SearchFilter') },
    { id: 'd6-t12', num: 12, title: 'Loading & Error States', load: () => import('./days/day06/Task12_LoadingErrorStates') },
  ]},
  { day: 7, label: 'Day 7', tasks: [
    { id: 'd7-t13', num: 13, title: 'Lifting State Up', load: () => import('./days/day07/Task13_LiftingStateUp') },
    { id: 'd7-t14', num: 14, title: 'Custom Hooks', load: () => import('./days/day07/Task14_CustomHooks') },
  ]},
  { day: 8, label: 'Day 8', tasks: [
    { id: 'd8-t15', num: 15, title: 'Context API', load: () => import('./days/day08/Task15_ContextApi') },
    { id: 'd8-t16', num: 16, title: 'React Router Basics', load: () => import('./days/day08/Task16_RouterBasics') },
  ]},
  { day: 9, label: 'Day 9', tasks: [
    { id: 'd9-t17', num: 17, title: 'Dynamic Routes', load: () => import('./days/day09/Task17_DynamicRoutes') },
    { id: 'd9-t18', num: 18, title: 'Form Validation', load: () => import('./days/day09/Task18_FormValidation') },
  ]},
  { day: 10, label: 'Day 10', tasks: [
    { id: 'd10-t19', num: 19, title: 'Weather App', load: () => import('./days/day10/Task19_WeatherApp') },
    { id: 'd10-t20', num: 20, title: 'E-commerce Cart', load: () => import('./days/day10/Task20_EcommerceCart') },
  ]},
  { day: 11, label: 'Day 11', tasks: [
    { id: 'd11-t21', num: 21, title: 'Quiz App', load: () => import('./days/day11/Task21_QuizApp') },
    { id: 'd11-t22', num: 22, title: 'Recipe Search App', load: () => import('./days/day11/Task22_RecipeSearchApp') },
  ]},
  { day: 12, label: 'Day 12', tasks: [
    { id: 'd12-t23', num: 23, title: 'Kanban Board', load: () => import('./days/day12/Task23_KanbanBoard') },
  ]},
  { day: 13, label: 'Day 13', tasks: [
    { id: 'd13-t24', num: 24, title: 'State Mgmt (Zustand)', load: () => import('./days/day13/Task24_StateManagement') },
    { id: 'd13-t25', num: 25, title: 'Testing', load: () => import('./days/day13/Task25_Testing') },
    { id: 'd13-t26', num: 26, title: 'Performance', load: () => import('./days/day13/Task26_Performance') },
  ]},
  { day: 14, label: 'Day 14', tasks: [
    { id: 'd14-t27', num: 27, title: 'TypeScript Basics', load: () => import('./days/day14/Task27_TypeScriptBasics') },
    { id: 'd14-t28', num: 28, title: 'Typed Store', load: () => import('./days/day14/Task28_TypedStore') },
  ]},
  { day: 15, label: 'Day 15', tasks: [
    { id: 'd15-t29', num: 29, title: 'Error Boundaries', load: () => import('./days/day15/Task29_ErrorBoundaries') },
    { id: 'd15-t30', num: 30, title: 'Code Splitting', load: () => import('./days/day15/Task30_CodeSplitting') },
  ]},
  { day: 16, label: 'Day 16', tasks: [
    { id: 'd16-t31', num: 31, title: 'Compound Components', load: () => import('./days/day16/Task31_CompoundComponents') },
  ]},
  { day: 17, label: 'Day 17', tasks: [
    { id: 'd17-t32', num: 32, title: 'Portals (Modal)', load: () => import('./days/day17/Task32_Portals') },
    { id: 'd17-t33', num: 33, title: 'Accessibility Pass', load: () => import('./days/day17/Task33_AccessibilityPass') },
  ]},
  { day: 18, label: 'Day 18', tasks: [
    { id: 'd18-t34', num: 34, title: 'Animation', load: () => import('./days/day18/Task34_Animation') },
  ]},
  { day: 19, label: 'Day 19', tasks: [
    { id: 'd19-t35', num: 35, title: 'Real Backend', load: () => import('./days/day19/Task35_RealBackend') },
  ]},
  { day: 20, label: 'Day 20', tasks: [
    { id: 'd20-t36', num: 36, title: 'Auth', load: () => import('./days/day20/Task36_Auth') },
    { id: 'd20-t37', num: 37, title: 'TanStack Query', load: () => import('./days/day20/Task37_TanStackQuery') },
  ]},
  { day: 21, label: 'Day 21', tasks: [
    { id: 'd21-t38', num: 38, title: 'Forms at Scale', load: () => import('./days/day21/Task38_FormsAtScale') },
    { id: 'd21-t39', num: 39, title: 'E2E Testing (Playwright)', load: () => import('./days/day21/Task39_E2ETesting') },
  ]},
  { day: 22, label: 'Day 22', tasks: [
    { id: 'd22-t40', num: 40, title: 'Performance Audit', load: () => import('./days/day22/Task40_PerformanceAudit') },
    { id: 'd22-t41', num: 41, title: 'Bundle Analysis', load: () => import('./days/day22/Task41_BundleAnalysis') },
  ]},
]

export const taskRegistry: DayEntry[] = rawRegistry.map((d) => ({
  day: d.day,
  label: d.label,
  tasks: d.tasks.map(({ load, ...task }) => ({
    ...task,
    Component: lazy(load),
    preload: () => {
      void load()
    },
  })),
}))

export const allTasks: TaskEntry[] = taskRegistry.flatMap((d) => d.tasks)

export function findTask(id: string): TaskEntry | undefined {
  return allTasks.find((t) => t.id === id)
}
