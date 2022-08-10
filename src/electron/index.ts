import { app, BrowserWindow, ipcMain , screen } from "electron";
import {join as pjoin} from "path";
import * as ipc from "../common/types";
import { existsSync , readFileSync , writeFileSync , mkdirSync , createWriteStream } from "fs-extra";
import axios from "axios";
import { uid } from "uid";

import https from 'https';

function downloadFile (url: string, targetFile: string) {  
    console.log("Download URL " + url);
    return new Promise<void>((resolve, reject) => {
        const file = createWriteStream(targetFile);
        const request = https.get(url, function(response) {
            response.pipe(file);

            // after download completed close filestream
            file.on("finish", () => {
                file.close();
                console.log("Download Completed");
                resolve();
            });
        });
    })
  };

app.whenReady().then(() => {
    let displays = screen.getAllDisplays();
    let externalDisplay = displays.find((display) => {
        return display.bounds.x !== 0 || display.bounds.y !== 0
    })

    let window;

    if (process.env.NODE_ENV === "dev") {
        if(externalDisplay) {
            window = new BrowserWindow({
                x: externalDisplay.bounds.x,
                y: externalDisplay.bounds.y,
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false,
                    nodeIntegrationInWorker: true,
                    nodeIntegrationInSubFrames: true,
                },
                width: 800,
                height: 600,
                minHeight: 600,
                minWidth: 450,
            })
        }else {
            window = new BrowserWindow({
                webPreferences: {
                    nodeIntegration: true,
                    contextIsolation: false,
                    nodeIntegrationInWorker: true,
                    nodeIntegrationInSubFrames: true,
                },
                width: 800,
                height: 600,
                minHeight: 600,
                minWidth: 450,
            });
        }
        window.loadURL("http://localhost:8080");
    } else {
        window = new BrowserWindow({
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                nodeIntegrationInWorker: true,
                nodeIntegrationInSubFrames: true,
            },
            width: 800,
            height: 600,
        });

        window.loadFile(pjoin(__dirname, "..", "..", "index.html"));
    }
});

let appDataDir = pjoin(app.getPath("appData") , "minecraft_server_manager");
if(!existsSync(appDataDir)) mkdirSync(appDataDir);

let serversDir = pjoin(appDataDir, "servers");
if(!existsSync(serversDir)) mkdirSync(serversDir);

let jarDir = pjoin(appDataDir, "jar");
if(!existsSync(jarDir)) mkdirSync(jarDir);

let servers_JSON: ipc.Server[] = [];

function saveSERVERJSON() {
    let appServerFile = pjoin(appDataDir , "server.json");
    writeFileSync(appServerFile, JSON.stringify(servers_JSON));
}

ipcMain.on(ipc.Channels.SERVER_LIST_REQ , (e) => {
    let appServerFile = pjoin(appDataDir , "server.json");
    if(existsSync(appServerFile)) {
        let data = readFileSync(appServerFile).toString();
        e.sender.send(ipc.Channels.SERVER_LIST_RES , JSON.parse(data));
        servers_JSON = JSON.parse(data);
    }else{
        console.log("Config File Doesn't exsist");
        e.sender.send(ipc.Channels.SERVER_LIST_RES , JSON.stringify([]));
        writeFileSync(appServerFile , "[]");
    }
});

ipcMain.on(ipc.Channels.PAPER_VERSION_LIST_REQ , (e) => {
    axios.get("https://papermc.io/api/v2/projects/paper/")
        .then(d => {
            let pvs: ipc.PAPER_VERSION_LIST_RES_PAYLOAD = {
                versions: d.data.versions as string[],
                error: false,
                error_message: ""
            };
            e.sender.send(ipc.Channels.PAPER_VERSION_LIST_RES , pvs);
        })
        .catch(e => {
            if(e.response.status == 404) {
                e.sender.send(ipc.Channels.PAPER_VERSION_LIST_RES, {
                    versions: [],
                    error: true,
                    error_message: "404 Not Found",
                });
            } else {
                e.sender.send(ipc.Channels.PAPER_VERSION_LIST_RES, {
                    versions: [],
                    error: true,
                    error_message: e.toString(),
                });
            }
        })
});

ipcMain.on(ipc.Channels.SERVER_ADD_REQ , (e , slrq: ipc.SERVER_ADD_REQ_PAYLOAD) => {
    console.log("REQ");
    let serverId = uid(64);
    let serverName = slrq.server.name;
    let serverPort = slrq.server.port;
    let version = slrq.server.version;

    let serverDir = pjoin(appDataDir, "servers" , serverId);
    mkdirSync(serverDir);

    servers_JSON.push({
        id: serverId,
        name: serverName,
        port: serverPort,
        status: false,
        version: version,
    });

    saveSERVERJSON();

    e.sender.send(ipc.Channels.TOAST_REQ , {
        msg: "Server added to database",
        type: "success",
    });

    let jarFileName = pjoin(jarDir , version + ".jar");
    if(!existsSync(jarFileName)) {
        e.sender.send(ipc.Channels.TOAST_REQ , {
            msg: "Download papermc jar file for mc " + version,
            type: "info",
        });
        axios(`https://papermc.io/api/v2/projects/paper/versions/${version}`)
            .then(d => {
                let buildT = d.data.builds.at(-1);
                let fileURL = `https://papermc.io/api/v2/projects/paper/versions/${version}/builds/${buildT}/downloads/paper-${version}-${buildT}.jar`;
                downloadFile(fileURL, jarFileName)
                    .then(e123 => {
                        e.sender.send(ipc.Channels.SERVER_ADD_RES , "DONE");
                        e.sender.send(ipc.Channels.TOAST_REQ , {
                            msg: "Papermc jar file downloaded",
                            type: "success",
                        });
                        e.sender.send(ipc.Channels.TOAST_REQ , {
                            msg: "Server success created",
                            type: "success",
                        });
                    })
            })
    }else {
        e.sender.send(ipc.Channels.SERVER_ADD_RES , "DONE");
        e.sender.send(ipc.Channels.TOAST_REQ , {
            msg: "Server succese created",
            type: "success",
        });
    }
});

ipcMain.on(ipc.Channels.SERVER_LIST_SET_REQ , (e , d: ipc.SERVER_LIST_SET_REQ_PAYLOAD) => {
    servers_JSON = d.servers;
    saveSERVERJSON();
    e.sender.send(ipc.Channels.TOAST_REQ , {
        msg: "Successfully edited",
        type: "success",
    })
});