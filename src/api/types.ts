export interface Todo {
  id: number
  text: string
  done: boolean
}

export interface TodosApi {
  list(): Promise<Todo[]>
  create(text: string): Promise<Todo>
  update(id: number, patch: Partial<Pick<Todo, 'text' | 'done'>>): Promise<Todo>
  remove(id: number): Promise<void>
}

export interface Api {
  /** 'server' = Express + SQLite over HTTP; 'demo' = in-browser (localStorage). */
  mode: 'server' | 'demo'
  todos: TodosApi
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
