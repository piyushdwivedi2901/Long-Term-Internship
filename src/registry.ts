import type { ComponentType } from 'react'
import Task1_StaticProfileCard from './days/day01/Task1_StaticProfileCard'
import Task2_PropsPractice from './days/day01/Task2_PropsPractice'
import Task3_ListRendering from './days/day02/Task3_ListRendering'
import Task4_ConditionalRendering from './days/day02/Task4_ConditionalRendering'
import Task5_CounterApp from './days/day03/Task5_CounterApp'
import Task6_ToggleSwitch from './days/day03/Task6_ToggleSwitch'
import Task7_SimpleForm from './days/day04/Task7_SimpleForm'
import Task8_TodoList from './days/day04/Task8_TodoList'
import Task9_UseEffectBasics from './days/day05/Task9_UseEffectBasics'
import Task10_FetchApiData from './days/day05/Task10_FetchApiData'
import Task11_SearchFilter from './days/day06/Task11_SearchFilter'
import Task12_LoadingErrorStates from './days/day06/Task12_LoadingErrorStates'
import Task13_LiftingStateUp from './days/day07/Task13_LiftingStateUp'
import Task14_CustomHooks from './days/day07/Task14_CustomHooks'
import Task15_ContextApi from './days/day08/Task15_ContextApi'
import Task16_RouterBasics from './days/day08/Task16_RouterBasics'
import Task17_DynamicRoutes from './days/day09/Task17_DynamicRoutes'
import Task18_FormValidation from './days/day09/Task18_FormValidation'
import Task19_WeatherApp from './days/day10/Task19_WeatherApp'
import Task20_EcommerceCart from './days/day10/Task20_EcommerceCart'
import Task21_QuizApp from './days/day11/Task21_QuizApp'
import Task22_RecipeSearchApp from './days/day11/Task22_RecipeSearchApp'
import Task23_KanbanBoard from './days/day12/Task23_KanbanBoard'
import Task24_StateManagement from './days/day13/Task24_StateManagement'
import Task25_Testing from './days/day13/Task25_Testing'
import Task26_Performance from './days/day13/Task26_Performance'
import Task27_TypeScriptBasics from './days/day14/Task27_TypeScriptBasics'
import Task28_TypedStore from './days/day14/Task28_TypedStore'
import Task29_ErrorBoundaries from './days/day15/Task29_ErrorBoundaries'
import Task30_CodeSplitting from './days/day15/Task30_CodeSplitting'
import Task31_CompoundComponents from './days/day16/Task31_CompoundComponents'
import Task32_Portals from './days/day17/Task32_Portals'
import Task33_AccessibilityPass from './days/day17/Task33_AccessibilityPass'
import Task34_Animation from './days/day18/Task34_Animation'
import Task35_RealBackend from './days/day19/Task35_RealBackend'
import Task36_Auth from './days/day20/Task36_Auth'
import Task37_TanStackQuery from './days/day20/Task37_TanStackQuery'
import Task38_FormsAtScale from './days/day21/Task38_FormsAtScale'

export interface TaskEntry {
  id: string
  num: number
  title: string
  Component: ComponentType
}

export interface DayEntry {
  day: number
  label: string
  tasks: TaskEntry[]
}

export const ROADMAP_TOTAL = 41

// Registry of every task. Each entry drives the sidebar nav, the breadcrumb
// header, deep links and the progress bar — add a day here and everything
// downstream updates automatically.
export const taskRegistry: DayEntry[] = [
  { day: 1, label: 'Day 1', tasks: [
    { id: 'd1-t1', num: 1, title: 'Static Profile Card', Component: Task1_StaticProfileCard },
    { id: 'd1-t2', num: 2, title: 'Props Practice', Component: Task2_PropsPractice },
  ]},
  { day: 2, label: 'Day 2', tasks: [
    { id: 'd2-t3', num: 3, title: 'List Rendering', Component: Task3_ListRendering },
    { id: 'd2-t4', num: 4, title: 'Conditional Rendering', Component: Task4_ConditionalRendering },
  ]},
  { day: 3, label: 'Day 3', tasks: [
    { id: 'd3-t5', num: 5, title: 'Counter App', Component: Task5_CounterApp },
    { id: 'd3-t6', num: 6, title: 'Toggle Switch', Component: Task6_ToggleSwitch },
  ]},
  { day: 4, label: 'Day 4', tasks: [
    { id: 'd4-t7', num: 7, title: 'Simple Form', Component: Task7_SimpleForm },
    { id: 'd4-t8', num: 8, title: 'To-Do List', Component: Task8_TodoList },
  ]},
  { day: 5, label: 'Day 5', tasks: [
    { id: 'd5-t9', num: 9, title: 'useEffect Basics', Component: Task9_UseEffectBasics },
    { id: 'd5-t10', num: 10, title: 'Fetch API Data', Component: Task10_FetchApiData },
  ]},
  { day: 6, label: 'Day 6', tasks: [
    { id: 'd6-t11', num: 11, title: 'Search/Filter', Component: Task11_SearchFilter },
    { id: 'd6-t12', num: 12, title: 'Loading & Error States', Component: Task12_LoadingErrorStates },
  ]},
  { day: 7, label: 'Day 7', tasks: [
    { id: 'd7-t13', num: 13, title: 'Lifting State Up', Component: Task13_LiftingStateUp },
    { id: 'd7-t14', num: 14, title: 'Custom Hooks', Component: Task14_CustomHooks },
  ]},
  { day: 8, label: 'Day 8', tasks: [
    { id: 'd8-t15', num: 15, title: 'Context API', Component: Task15_ContextApi },
    { id: 'd8-t16', num: 16, title: 'React Router Basics', Component: Task16_RouterBasics },
  ]},
  { day: 9, label: 'Day 9', tasks: [
    { id: 'd9-t17', num: 17, title: 'Dynamic Routes', Component: Task17_DynamicRoutes },
    { id: 'd9-t18', num: 18, title: 'Form Validation', Component: Task18_FormValidation },
  ]},
  { day: 10, label: 'Day 10', tasks: [
    { id: 'd10-t19', num: 19, title: 'Weather App', Component: Task19_WeatherApp },
    { id: 'd10-t20', num: 20, title: 'E-commerce Cart', Component: Task20_EcommerceCart },
  ]},
  { day: 11, label: 'Day 11', tasks: [
    { id: 'd11-t21', num: 21, title: 'Quiz App', Component: Task21_QuizApp },
    { id: 'd11-t22', num: 22, title: 'Recipe Search App', Component: Task22_RecipeSearchApp },
  ]},
  { day: 12, label: 'Day 12', tasks: [
    { id: 'd12-t23', num: 23, title: 'Kanban Board', Component: Task23_KanbanBoard },
  ]},
  { day: 13, label: 'Day 13', tasks: [
    { id: 'd13-t24', num: 24, title: 'State Mgmt (Zustand)', Component: Task24_StateManagement },
    { id: 'd13-t25', num: 25, title: 'Testing', Component: Task25_Testing },
    { id: 'd13-t26', num: 26, title: 'Performance', Component: Task26_Performance },
  ]},
  { day: 14, label: 'Day 14', tasks: [
    { id: 'd14-t27', num: 27, title: 'TypeScript Basics', Component: Task27_TypeScriptBasics },
    { id: 'd14-t28', num: 28, title: 'Typed Store', Component: Task28_TypedStore },
  ]},
  { day: 15, label: 'Day 15', tasks: [
    { id: 'd15-t29', num: 29, title: 'Error Boundaries', Component: Task29_ErrorBoundaries },
    { id: 'd15-t30', num: 30, title: 'Code Splitting', Component: Task30_CodeSplitting },
  ]},
  { day: 16, label: 'Day 16', tasks: [
    { id: 'd16-t31', num: 31, title: 'Compound Components', Component: Task31_CompoundComponents },
  ]},
  { day: 17, label: 'Day 17', tasks: [
    { id: 'd17-t32', num: 32, title: 'Portals (Modal)', Component: Task32_Portals },
    { id: 'd17-t33', num: 33, title: 'Accessibility Pass', Component: Task33_AccessibilityPass },
  ]},
  { day: 18, label: 'Day 18', tasks: [
    { id: 'd18-t34', num: 34, title: 'Animation', Component: Task34_Animation },
  ]},
  { day: 19, label: 'Day 19', tasks: [
    { id: 'd19-t35', num: 35, title: 'Real Backend', Component: Task35_RealBackend },
  ]},
  { day: 20, label: 'Day 20', tasks: [
    { id: 'd20-t36', num: 36, title: 'Auth', Component: Task36_Auth },
    { id: 'd20-t37', num: 37, title: 'TanStack Query', Component: Task37_TanStackQuery },
  ]},
  { day: 21, label: 'Day 21', tasks: [
    { id: 'd21-t38', num: 38, title: 'Forms at Scale', Component: Task38_FormsAtScale },
  ]},
]

export const allTasks: TaskEntry[] = taskRegistry.flatMap((d) => d.tasks)

export function findTask(id: string): TaskEntry | undefined {
  return allTasks.find((t) => t.id === id)
}
