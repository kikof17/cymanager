const { app, BrowserWindow, shell, Menu } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;

function createMainWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    autoHideMenuBar: true,
    backgroundColor: "#111827",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (isDev) {
    window.loadURL("http://localhost:5173");
    window.webContents.openDevTools({ mode: "detach" });
  } else {
    window.loadFile(path.join(__dirname, "..", "dist", "index.html"));
  }
}

app.whenReady().then(() => {
  const template = [
    {
      label: "Affichage",
      submenu: [
        { role: "reload", label: "Recharger" },
        { role: "forceReload", label: "Recharger sans cache" },
        { type: "separator" },
        { role: "togglefullscreen", label: "Plein ecran" },
      ],
    },
    {
      label: "Aide",
      submenu: [
        {
          label: "Ouvrir la version web",
          click: () => shell.openExternal("https://kikof17.github.io/cymanager/"),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
