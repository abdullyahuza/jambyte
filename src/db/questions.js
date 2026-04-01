// DB query functions — these use window.electronAPI (set up by preload.js via contextBridge)
// All actual SQLite queries are in electron/main.js IPC handlers

export const getSubjects = () => window.electronAPI.getSubjects()

export const getQuestions = (opts) => window.electronAPI.getQuestions(opts)

export const getAllExamQuestions = (subjects) => window.electronAPI.getAllExamQuestions(subjects)

export const saveResult = (result) => window.electronAPI.saveResult(result)

export const getResults = () => window.electronAPI.getResults()
