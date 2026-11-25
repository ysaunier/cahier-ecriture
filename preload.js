const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("cahier", {
  print: paper => ipcRenderer.invoke("cahier:print", paper),
  savePdf: (paper, label) => ipcRenderer.invoke("cahier:pdf", paper, label),
  info: () => ipcRenderer.invoke("cahier:info"),
  open: name => ipcRenderer.invoke("cahier:open", name),
  exportSettings: json => ipcRenderer.invoke("cahier:exportSettings", json),
  importSettings: () => ipcRenderer.invoke("cahier:importSettings"),
  onMenu: callback => ipcRenderer.on("cahier:menu", (_event, command) => callback(command)),
});
