import { useState } from 'react'

import Task1_StaticProfileCard from './days/day01/Task1_StaticProfileCard.jsx'
import Task2_PropsPractice from './days/day01/Task2_PropsPractice.jsx'
import Task3_ListRendering from './days/day02/Task3_ListRendering.jsx'
import Task4_ConditionalRendering from './days/day02/Task4_ConditionalRendering.jsx'
import Task5_CounterApp from './days/day03/Task5_CounterApp.jsx'
import Task6_ToggleSwitch from './days/day03/Task6_ToggleSwitch.jsx'
import Task7_SimpleForm from './days/day04/Task7_SimpleForm.jsx'
import Task8_TodoList from './days/day04/Task8_TodoList.jsx'
import Task9_UseEffectBasics from './days/day05/Task9_UseEffectBasics.jsx'
import Task10_FetchApiData from './days/day05/Task10_FetchApiData.jsx'
import Task11_SearchFilter from './days/day06/Task11_SearchFilter.jsx'
import Task12_LoadingErrorStates from './days/day06/Task12_LoadingErrorStates.jsx'
import Task13_LiftingStateUp from './days/day07/Task13_LiftingStateUp.jsx'
import Task14_CustomHooks from './days/day07/Task14_CustomHooks.jsx'
import Task15_ContextApi from './days/day08/Task15_ContextApi.jsx'
import Task16_RouterBasics from './days/day08/Task16_RouterBasics.jsx'
import Task17_DynamicRoutes from './days/day09/Task17_DynamicRoutes.jsx'
import Task18_FormValidation from './days/day09/Task18_FormValidation.jsx'
import Task19_WeatherApp from './days/day10/Task19_WeatherApp.jsx'
import Task20_EcommerceCart from './days/day10/Task20_EcommerceCart.jsx'
import Task21_QuizApp from './days/day11/Task21_QuizApp.jsx'
import Task22_RecipeSearchApp from './days/day11/Task22_RecipeSearchApp.jsx'
import Task23_KanbanBoard from './days/day12/Task23_KanbanBoard.jsx'
import Task24_StateManagement from './days/day13/Task24_StateManagement.jsx'
import Task25_Testing from './days/day13/Task25_Testing.jsx'
import Task26_Performance from './days/day13/Task26_Performance.jsx'

// Registry of every task. Each entry drives the sidebar nav, the breadcrumb
// header, and which component renders — add a day here and everything
// downstream (nav, progress bar, breadcrumb) updates automatically.
const taskRegistry = [
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
]

const allTasks = taskRegistry.flatMap((d) => d.tasks)

export default function App() {
  const [activeId, setActiveId] = useState(allTasks[0].id)
  const activeDay = taskRegistry.find((d) => d.tasks.some((t) => t.id === activeId))
  const active = allTasks.find((t) => t.id === activeId)
  const ActiveComponent = active.Component

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <p className="sidebar-eyebrow">react / practice-log</p>
          <h1 className="sidebar-title">Long Term Internship</h1>
          <p className="sidebar-subtitle">26 tasks, one commit per day</p>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: '100%' }} />
          </div>
          <p className="progress-label">26 / 26 tasks complete</p>
        </div>

        <nav className="commit-graph">
          {taskRegistry.map((day) => (
            <div
              key={day.day}
              className={`day-node ${day.day === activeDay.day ? 'has-active' : ''}`}
            >
              <p className="day-label">{day.label}</p>
              <ul>
                {day.tasks.map((t) => (
                  <li key={t.id}>
                    <button
                      className={`task-nav-btn ${t.id === activeId ? 'active' : ''}`}
                      onClick={() => setActiveId(t.id)}
                    >
                      {String(t.num).padStart(2, '0')} · {t.title}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      <div className="content-wrap">
        <div className="content-header">
          <span>{activeDay.label}</span>
          <span className="crumb-sep">/</span>
          <span className="crumb-current">Task {active.num.toString().padStart(2, '0')} · {active.title}</span>
        </div>
        <main className="content">
          <ActiveComponent />
        </main>
      </div>
    </div>
  )
}
