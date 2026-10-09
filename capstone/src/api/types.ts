import type {
  CommentInput,
  LoginInput,
  MoveInput,
  ProfileInput,
  ProjectInput,
  ProjectPatch,
  SignupInput,
  TaskInput,
  TaskPatch,
  TaskQuery,
} from '../../shared/schemas.ts'
import type { Activity, Comment, Project, Session, Stats, Task, User } from '../../shared/types.ts'

export type BackendMode = 'server' | 'demo'

/** Everything the UI can ask the backend. Implemented over HTTP and in-browser. */
export interface ApiClient {
  mode: BackendMode
  signup(input: SignupInput): Promise<Session>
  login(input: LoginInput): Promise<Session>
  me(): Promise<User>
  updateProfile(input: ProfileInput): Promise<User>
  deleteAccount(input: { password: string }): Promise<void>

  listProjects(): Promise<Project[]>
  getProject(id: number): Promise<Project>
  createProject(input: ProjectInput): Promise<Project>
  updateProject(id: number, patch: ProjectPatch): Promise<Project>
  deleteProject(id: number): Promise<void>

  listTasks(query?: TaskQuery): Promise<Task[]>
  getTask(id: number): Promise<Task>
  createTask(input: TaskInput): Promise<Task>
  updateTask(id: number, patch: TaskPatch): Promise<Task>
  moveTask(id: number, input: MoveInput): Promise<Task>
  deleteTask(id: number): Promise<void>

  listComments(taskId: number): Promise<Comment[]>
  addComment(taskId: number, input: CommentInput): Promise<Comment>
  deleteComment(id: number): Promise<void>

  activity(limit?: number): Promise<Activity[]>
  stats(today: string): Promise<Stats>
  seedSample(today: string): Promise<Project[]>
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly fields?: Record<string, string>
  constructor(status: number, code: string, message: string, fields?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export type TokenGetter = () => string | null
