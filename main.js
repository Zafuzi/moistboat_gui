// Modules to control application life and create native browser window
const { fail } = require('assert');
const { app, BrowserWindow, protocol, ipcMain } = require('electron');
const path = require('path');
const { exit } = require('process');
const runq = require("runq");
const electron = require("electron");
const url = require("url");

try {
    require('electron-reloader')(module, {
        debug: true,
        watchRenderer: true
    });
} catch (_) { console.log('Error'); }

const fs = require("fs");
var regedit = require('regedit')

function isOSWin64() {
    return process.arch === 'x64' || process.env.hasOwnProperty('PROCESSOR_ARCHITEW6432');
}
let steam_path = isOSWin64 ? 'HKLM\\SOFTWARE\\Wow6432Node\\Valve\\Steam' : 'HKLM\\SOFTWARE\\Valve\\Steam';

let steam_install_path = "";
let fsx_install_path = "";
let fsx_airplanes_path = "";

let filenames = [];

let rq = runq();

rq.add(cb => {
    regedit.list(steam_path, function(err, result) {
        steam_install_path = result[steam_path].values.InstallPath.value;


        if (!fs.existsSync(steam_install_path + "/steamapps/common/FSX")) {
            let vdf = require("node-vdf");
            let data = vdf.parse(fs.readFileSync(steam_install_path + "/steamapps/libraryfolders.vdf"));
            if (data.LibraryFolders) {
                fsx_install_path = data.LibraryFolders["1"] + "/steamapps/common/FSX";
            } else {
                fail();
                exit(0);
            }

        } else {
            fsx_install_path = steam_install_path + "/steamapps/common/FSX";
        }

        cb();
    })
})

rq.add(cb => {
    console.log(fsx_install_path)
    fsx_airplanes_path = fsx_install_path + "/SimObjects/Airplanes";
    filenames = fs.readdirSync(fsx_airplanes_path);
    cb();
})

ipcMain.on("list_planes", (event, args) => {
    mainWindow.webContents.send("list_planes", filenames);
});

ipcMain.on("get_cfg", (event, args) => {
    let cfg = fs.readFileSync(`${fsx_airplanes_path}/${args}/aircraft.cfg`, "ascii");
    mainWindow.webContents.send("get_cfg", cfg.toString());
});

ipcMain.on("save_cfg", (event, args) => {
    let message = "Plane config not found";
    if (args.plane_name && args.cfg) {

        let p = `${fsx_airplanes_path}/${args.plane_name}`;
        try {
            if (fs.existsSync(p + "/backup.cfg")) {
                // okay we have an og backup
                message = "backup exists"
                fs.writeFileSync(p + "/aircraft.cfg", args.cfg, "ascii");
                message += " aircraft.cfg updated";
            } else {
                // create a backup first
                fs.writeFileSync(p + "/backup.cfg", fs.readFileSync(p + "/aircraft.cfg", "ascii"), "ascii");

                if (!fs.existsSync(p + "/backup.cfg")) {
                    message = "backup failed. Aircraft.cfg not touched";
                } else {
                    message = "backup created";
                    fs.writeFileSync(p + "/aircraft.cfg", args.cfg, "ascii");
                    message += " aircraft.cfg updated";
                }
            }
        } catch (err) {
            message = err;
        }
    }
    mainWindow.webContents.send("alert", `${message}: ${fsx_airplanes_path}/${args.plane_name}`);
});

let mainWindow;

function createWindow() {

    let x = 10;
    let y = 10;

    let w = 800;
    let h = 600;

    let displays = electron.screen.getAllDisplays()
    let externalDisplay = displays.find((display) => {
        return display.bounds.x !== 0 || display.bounds.y !== 0
    })

    if (externalDisplay) {
        x = (externalDisplay.bounds.x);
        y += (externalDisplay.bounds.y);
    }

    // Create the browser window.
    mainWindow = new BrowserWindow({
        title: "MoistBoat",
        width: w,
        height: h,
        x: x,
        y: y,
        useContentSize: true,
        backgroundColor: '#FFF', // Add this new line
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    })

    mainWindow.setMenu(null);

    // and load the index.html of the app.
    mainWindow.loadURL(url.format({
            pathname: 'index.html',
            /* Attention here: origin is path.join(__dirname, 'index.html') */
            protocol: 'file',
            slashes: true
        }))
        // Open the DevTools.
        //mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
    rq.run(() => {
        console.log("ready")

        protocol.interceptFileProtocol('file', (request, callback) => {
            const url = request.url.substr(7) /* all urls start with 'file://' */
            callback({ path: path.normalize(`${__dirname}/${url}`) })
        }, (err) => {
            if (err) console.error('Failed to register protocol')
        })

        createWindow()
        app.on('activate', function() {
            // On macOS it's common to re-create a window in the app when the
            // dock icon is clicked and there are no other windows open.
            if (BrowserWindow.getAllWindows().length === 0) createWindow()
        })
    });
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function() {
    if (process.platform !== 'darwin') app.quit()
})