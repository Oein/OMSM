import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
import { join as pjoin } from "path";
import * as ipc from "../common/types";
import {
	existsSync,
	readFileSync,
	writeFileSync,
	mkdirSync,
	createWriteStream,
	rmdirSync,
	copySync,
} from "fs-extra";
import axios from "axios";
import { uid } from "uid";
import { get } from "https";
import { spawn, ChildProcess } from "child_process";

let child_processes: { [key: string]: ChildProcess } = {};

let appDataDir = pjoin(app.getPath("appData"), "minecraft_server_manager");
if (!existsSync(appDataDir)) mkdirSync(appDataDir);

let serversDir = pjoin(appDataDir, "servers");
if (!existsSync(serversDir)) mkdirSync(serversDir);

let jarDir = pjoin(appDataDir, "jar");
if (!existsSync(jarDir)) mkdirSync(jarDir);

let servers_JSON: ipc.Server[] = [];

function downloadFile(url: string, targetFile: string) {
	console.log("Download URL " + url);
	return new Promise<void>((resolve, reject) => {
		const file = createWriteStream(targetFile);
		get(url, function (response) {
			response.pipe(file);

			// after download completed close filestream
			file.on("finish", () => {
				file.close();
				console.log("Download Completed");
				resolve();
			});
		});
	});
}

function saveSERVERJSON() {
	let appServerFile = pjoin(appDataDir, "server.json");
	let ale: ipc.Server[] = servers_JSON;
	Object.keys(ale).forEach((k) => {
		ale[k as any as number].status = false;
	});
	writeFileSync(appServerFile, JSON.stringify(ale));
}

let window: BrowserWindow;

app.whenReady().then(() => {
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

	if (process.env.NODE_ENV === "dev") {
		window.loadURL("http://localhost:8080");
	} else {
		window.loadFile(pjoin(__dirname, "..", "..", "index.html"));
	}

	// Kill All Minecraft Servers
	window.on("closed", () => {
		Object.keys(child_processes).forEach((k) => {
			child_processes[k].kill(0);
		});
	});
});

ipcMain.on(ipc.Channels.SERVER_LIST_REQ, (e) => {
	let appServerFile = pjoin(appDataDir, "server.json");
	if (!existsSync(appServerFile)) {
		writeFileSync(appServerFile, "[]");
	}

	let data = readFileSync(appServerFile).toString();
	e.sender.send(ipc.Channels.SERVER_LIST_RES, JSON.parse(data));
	servers_JSON = JSON.parse(data);
});

ipcMain.on(ipc.Channels.PAPER_VERSION_LIST_REQ, (e) => {
	axios
		.get("https://papermc.io/api/v2/projects/paper/")
		.then((d) => {
			let pvs: ipc.PAPER_VERSION_LIST_RES_PAYLOAD = {
				versions: d.data.versions as string[],
				error: false,
				error_message: "",
			};
			e.sender.send(ipc.Channels.PAPER_VERSION_LIST_RES, pvs);
		})
		.catch((e) => {
			if (e.response.status == 404) {
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
		});
});

ipcMain.on(
	ipc.Channels.SERVER_ADD_REQ,
	(e, slrq: ipc.SERVER_ADD_REQ_PAYLOAD) => {
		let serverId = uid(64);
		let serverName = slrq.server.name;
		let serverPort = slrq.server.port;
		let version = slrq.server.version;
		let ram = slrq.server.ram;

		let serverDir = pjoin(appDataDir, "servers", serverId);
		mkdirSync(serverDir);

		servers_JSON.push({
			id: serverId,
			name: serverName,
			port: serverPort,
			status: false,
			version: version,
			ram: ram,
		});

		saveSERVERJSON();

		e.sender.send(ipc.Channels.TOAST_REQ, {
			msg: "Server added to database",
			type: "success",
		});

		let jarFileName = pjoin(jarDir, version + ".jar");
		if (!existsSync(jarFileName)) {
			e.sender.send(ipc.Channels.TOAST_REQ, {
				msg: "Download papermc jar file for mc " + version,
				type: "info",
			});
			axios(
				`https://papermc.io/api/v2/projects/paper/versions/${version}`
			).then((d) => {
				let buildT = d.data.builds.at(-1);
				let fileURL = `https://papermc.io/api/v2/projects/paper/versions/${version}/builds/${buildT}/downloads/paper-${version}-${buildT}.jar`;
				downloadFile(fileURL, jarFileName).then((e123) => {
					e.sender.send(ipc.Channels.SERVER_ADD_RES, "DONE");
					e.sender.send(ipc.Channels.TOAST_REQ, {
						msg: "Papermc jar file downloaded",
						type: "success",
					});
					e.sender.send(ipc.Channels.TOAST_REQ, {
						msg: "Server success created",
						type: "success",
					});
				});
			});
		} else {
			e.sender.send(ipc.Channels.SERVER_ADD_RES, "DONE");
			e.sender.send(ipc.Channels.TOAST_REQ, {
				msg: "Server succese created",
				type: "success",
			});
		}
	}
);

ipcMain.on(
	ipc.Channels.SERVER_LIST_SET_REQ,
	(e, d: ipc.SERVER_LIST_SET_REQ_PAYLOAD) => {
		servers_JSON = d.servers;
		saveSERVERJSON();
		e.sender.send(ipc.Channels.TOAST_REQ, {
			msg: "Successfully edited",
			type: "success",
		});
	}
);

ipcMain.on(ipc.Channels.SERVER_ON_REQ, (e, d: ipc.SERVER_ON_REQ_PAYLOAD) => {
	console.log(`start server ${d.id}`);
	let tos = servers_JSON[servers_JSON.findIndex((s) => s.id == d.id)];
	servers_JSON[servers_JSON.findIndex((s) => s.id == d.id)].status = true;
	let command = `java `;
	let argvs = [
		`-Xmx${tos.ram}G`,
		`-Xms${tos.ram}G`,
		"-XX:+ParallelRefProcEnabled",
		"-XX:MaxGCPauseMillis=200",
		"-XX:+UnlockExperimentalVMOptions",
		"-XX:+DisableExplicitGC",
		"-XX:+AlwaysPreTouch",
		"-XX:G1HeapWastePercent=5",
		"-XX:G1MixedGCCountTarget=4",
		"-XX:G1MixedGCLiveThresholdPercent=90",
		"-XX:G1RSetUpdatingPauseTimePercent=5",
		"-XX:SurvivorRatio=32",
		"-XX:+PerfDisableSharedMem",
		"-XX:MaxTenuringThreshold=1",
		"-Dusing.aikars.flags=https://mcflags.emc.gs",
		"-Daikars.new.flags=true",
		`-Dfile.encoding=UTF-8`,
		`-Dcom.mojang.eula.agree=true`,
		`-jar`,
		`"${pjoin(jarDir, tos.version + ".jar")}"`,
		`--nogui`,
		`-p${tos.port}`,
	];
	command += argvs.join(" ");
	command += " && exit";
	child_processes[tos.id] = spawn(command, {
		cwd: pjoin(serversDir, tos.id),
		shell: true,
	});
	child_processes[tos.id].stdout?.on("data", function (data) {
		let sl: ipc.SERVER_LOG_PAYLOAD = {
			id: tos.id,
			message: data.toString(),
		};
		e.sender.send(ipc.Channels.SERVER_LOG, sl);
		console.log(data.toString());
		if ((data.toString() as string).includes("Closing Server")) {
			e.sender.send(ipc.Channels.SERVER_OFF_RES, tos.id);
		}
	});
	child_processes[tos.id].stderr?.on("data", function (data) {
		let sl: ipc.SERVER_LOG_PAYLOAD = {
			id: tos.id,
			message: data.toString(),
		};
		e.sender.send(ipc.Channels.SERVER_LOG, sl);
		console.log(data.toString());
	});
	child_processes[tos.id].on("exit", () => {
		e.sender.send(ipc.Channels.SERVER_OFF_RES, tos.id);
	});
	child_processes[tos.id].on("close", () => {
		e.sender.send(ipc.Channels.SERVER_OFF_RES, tos.id);
	});
	e.sender.send(ipc.Channels.SERVER_ON_RES, tos.id);
});

ipcMain.on(ipc.Channels.SERVER_OFF_REQ, (e, d: ipc.SERVER_ON_REQ_PAYLOAD) => {
	console.log(`kill server ${d.id}`);
	servers_JSON[servers_JSON.findIndex((s) => s.id == d.id)].status = false;
	let x = child_processes[d.id].kill();
	e.sender.send(ipc.Channels.SERVER_OFF_RES, d.id);
});

ipcMain.on(ipc.Channels.SERVER_COMMAND, (_, d: ipc.SERVER_COMMAND_PAYLOAD) => {
	child_processes[d.id].stdin?.write(d.command + "\n");
});

ipcMain.on(ipc.Channels.SERVER_REMOVE_REQ, (e, d: string) => {
	e.sender.send(ipc.Channels.TOAST_REQ, {
		msg: "Start removing server folder",
		type: "info",
	});
	rmdirSync(pjoin(serversDir, d), { recursive: true });
	servers_JSON = servers_JSON.filter((v) => v.id != d);
	saveSERVERJSON();
	e.sender.send(ipc.Channels.SERVER_REMOVE_RES, "");
});

ipcMain.on(ipc.Channels.OPEN_SERVER_FOLDER_REQ, (_, d: string) => {
	shell.showItemInFolder(pjoin(serversDir, d));
});

ipcMain.on(ipc.Channels.SERVER_DIR_DIALOG_REQ, (e, d) => {
	let x = dialog.showOpenDialogSync(window, {
		properties: ["openDirectory"],
	});
	if (x == undefined) x = [""];
	e.sender.send(ipc.Channels.SERVER_DIR_DIALOG_RES, x[0]);
});

ipcMain.on(
	ipc.Channels.SERVER_IMPORT_REQ,
	(e, slrq: ipc.SERVER_IMPORT_REQ_PAYLOAD) => {
		let serverId = uid(64);
		let serverName = slrq.server.name;
		let serverPort = slrq.server.port;
		let version = slrq.server.version;
		let ram = slrq.server.ram;
		let serverOldDir = slrq.dir;

		let serverDir = pjoin(appDataDir, "servers", serverId);
		mkdirSync(serverDir);

		e.sender.send(ipc.Channels.TOAST_REQ, {
			msg: "Server Copy Started",
			type: "info",
		});
		try {
			copySync(serverOldDir, serverDir);
		} catch (err) {
			e.sender.send(ipc.Channels.TOAST_REQ, {
				msg: "Error occurred while copying your server",
				type: "error",
			});
			e.sender.send(ipc.Channels.SERVER_ADD_RES, "DONE");
			return;
		}
		e.sender.send(ipc.Channels.TOAST_REQ, {
			msg: "Server Copy Ended",
			type: "success",
		});

		servers_JSON.push({
			id: serverId,
			name: serverName,
			port: serverPort,
			status: false,
			version: version,
			ram: ram,
		});

		saveSERVERJSON();

		e.sender.send(ipc.Channels.TOAST_REQ, {
			msg: "Server added to database",
			type: "success",
		});

		let jarFileName = pjoin(jarDir, version + ".jar");
		if (!existsSync(jarFileName)) {
			e.sender.send(ipc.Channels.TOAST_REQ, {
				msg: "Download papermc jar file for mc " + version,
				type: "info",
			});
			axios(
				`https://papermc.io/api/v2/projects/paper/versions/${version}`
			).then((d) => {
				let buildT = d.data.builds.at(-1);
				let fileURL = `https://papermc.io/api/v2/projects/paper/versions/${version}/builds/${buildT}/downloads/paper-${version}-${buildT}.jar`;
				downloadFile(fileURL, jarFileName).then((e123) => {
					e.sender.send(ipc.Channels.SERVER_ADD_RES, "DONE");
					e.sender.send(ipc.Channels.TOAST_REQ, {
						msg: "Papermc jar file downloaded",
						type: "success",
					});
					e.sender.send(ipc.Channels.TOAST_REQ, {
						msg: "Server success created",
						type: "success",
					});
				});
			});
		} else {
			e.sender.send(ipc.Channels.SERVER_ADD_RES, "DONE");
			e.sender.send(ipc.Channels.TOAST_REQ, {
				msg: "Server succese created",
				type: "success",
			});
		}
	}
);
