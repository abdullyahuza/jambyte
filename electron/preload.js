const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getSubjects: () => ipcRenderer.invoke('get-subjects'),
  getQuestions: (opts) => ipcRenderer.invoke('get-questions', opts),
  getAllExamQuestions: (subjects) => ipcRenderer.invoke('get-all-exam-questions', subjects),
  saveResult: (result) => ipcRenderer.invoke('save-result', result),
  getResults: () => ipcRenderer.invoke('get-results'),
  getDiagram: (imagePath) => ipcRenderer.invoke('get-diagram', imagePath),
  adminPickImage: () => ipcRenderer.invoke('admin-pick-image'),
  adminSaveImage: (srcPath) => ipcRenderer.invoke('admin-save-image', srcPath),
  // Admin
  adminAddQuestion: (q) => ipcRenderer.invoke('admin-add-question', q),
  adminGetStats: () => ipcRenderer.invoke('admin-get-stats'),
  adminGetQuestions: (opts) => ipcRenderer.invoke('admin-get-questions', opts),
  adminUpdateQuestion: (q) => ipcRenderer.invoke('admin-update-question', q),
  adminDeleteQuestion: (id) => ipcRenderer.invoke('admin-delete-question', id),
  adminGetYears: (subject) => ipcRenderer.invoke('admin-get-years', subject),
  adminGetAllSubjects: () => ipcRenderer.invoke('admin-get-all-subjects'),
  adminAddSubject: (name) => ipcRenderer.invoke('admin-add-subject', name),
  adminGetAllYears: () => ipcRenderer.invoke('admin-get-all-years'),
  adminAddYear: (year) => ipcRenderer.invoke('admin-add-year', year),
  // Admin auth
  adminLogin: (creds) => ipcRenderer.invoke('admin-login', creds),
  // License
  checkLicense: () => ipcRenderer.invoke('check-license'),
  activateLicense: (code) => ipcRenderer.invoke('activate-license', code),
  generateLicense: (expiry) => ipcRenderer.invoke('generate-license', expiry),
})
