import React, { useState, useEffect } from "react";

import {
	Text,
	Table,
	useTheme,
	Tooltip,
	Grid,
	Modal,
	Button,
	Input,
	Dropdown,
	Card,
	Loading,
	Popover,
} from "@nextui-org/react";
import {
	AiOutlineSetting,
	AiOutlineDesktop,
	AiOutlinePlus,
	AiOutlineDelete,
	AiOutlineFolderAdd,
} from "react-icons/ai";
const { ipcRenderer } = window.require("electron");
import * as ipc from "../common/types";
import { toast, ToastContainer } from "react-toastify";
import { uid } from "uid";
import { confirmAlert } from "react-confirm-alert";

function App() {
	// Table
	const { theme } = useTheme();
	const [hovered, setHovered] = useState(-1);
	const [servers, setServers] = useState<ipc.Server[]>([]);

	// Versions
	const [versionMenuOpened, setVersionMenuOpened] = useState(false);
	const [MCVers, setMCVers] = useState<string[]>([]);

	// Add Menu
	const [serverName, setServerName] = useState("");
	const [serverPort, setServerPort] = useState(25565);
	const [serverVersion, setServerVersion] = useState("Loading...");
	const [addRequested, setAddRequested] = useState(false);
	const [serverRam, setServerRam] = useState("");

	// Import Menu

	// Settings / Console
	const [manageModalId, setManageModalId] = useState(0);
	const [managingServerId, setManagingServerId] = useState(-1);
	const [managingServer, setManagingServer] = useState<ipc.Server>({
		id: "",
		name: "",
		port: 0,
		status: false,
		version: "",
		ram: 0,
	});
	const [rfr, setRFR] = useState("");
	const [logs, setLogs] = useState<{ [key: string]: string }>({});
	const [serverTurnRequest, setSTRQ] = useState(false);
	const [consoleCommand, setConsoleCommand] = useState("");

	// Server Import
	const [serverDir, setServerDir] = useState("");

	let servers2: ipc.Server[] = [];

	useEffect(() => {
		// Get servers
		ipcRenderer.send(ipc.Channels.SERVER_LIST_REQ, "");
		// Get paper mc versions
		ipcRenderer.send(ipc.Channels.PAPER_VERSION_LIST_REQ, "");

		// Update server list
		ipcRenderer.on(
			ipc.Channels.SERVER_LIST_RES,
			(e, slrp: ipc.Server[]) => {
				setServers(slrp);
				servers2 = slrp;
			}
		);

		// Update paper mc version list
		ipcRenderer.on(
			ipc.Channels.PAPER_VERSION_LIST_RES,
			(e, slrp: ipc.PAPER_VERSION_LIST_RES_PAYLOAD) => {
				if (!slrp.error) {
					setMCVers(slrp.versions);
					setServerVersion(slrp.versions.at(-1) as string);
				} else {
					toast(
						"Error occurred while fetching mc versions : " +
							slrp.error_message,
						{ type: "error" }
					);
				}
			}
		);

		// Toast
		ipcRenderer.on(
			ipc.Channels.TOAST_REQ,
			(e, d: ipc.TOAST_REQ_PAYLOAD) => {
				toast(d.msg, { type: d.type });
			}
		);

		// Exit Modal
		// Refresh Server List
		ipcRenderer.on(ipc.Channels.SERVER_ADD_RES, (e) => {
			setManageModalId(0);
			setAddRequested(false);
			ipcRenderer.send(ipc.Channels.SERVER_LIST_REQ, "");
		});

		// Update Logs
		// Force Refresh
		ipcRenderer.on(
			ipc.Channels.SERVER_LOG,
			(e, d: ipc.SERVER_LOG_PAYLOAD) => {
				let sl = logs;
				if (sl[d.id] == undefined) sl[d.id] = "";
				sl[d.id] += "\n" + d.message;
				setLogs(sl);
				setRFR(uid());
			}
		);

		// Update Status
		// Force Refresh
		// Toast
		ipcRenderer.on(ipc.Channels.SERVER_ON_RES, (e, d) => {
			servers2[servers2.findIndex((s) => s.id == d)].status = true;
			setServers(servers2);
			setSTRQ(false);
			setRFR(uid());
			toast("Server started", { type: "info" });
		});

		// Update Status
		// Force Refresh
		// Toast
		ipcRenderer.on(ipc.Channels.SERVER_OFF_RES, (e, d) => {
			servers2[servers2.findIndex((s) => s.id == d)].status = false;
			setServers(servers2);
			setSTRQ(false);
			setRFR(uid());
			toast("Server ended", { type: "info" });
		});

		// Update server list
		// Toast
		ipcRenderer.on(ipc.Channels.SERVER_REMOVE_RES, (e, d) => {
			toast("Your server has been removed", { type: "info" });
			ipcRenderer.send(ipc.Channels.SERVER_LIST_REQ, "");
		});

		ipcRenderer.on(ipc.Channels.SERVER_DIR_DIALOG_RES, (e, d) => {
			setServerDir(d);
		});
	}, []);

	return (
		<div
			style={{
				margin: "10px",
				height: "calc(100vh-20px)",
			}}
		>
			{/* ------------------ Extra Components ------------------ */}
			{/* Force Update */}
			<div
				style={{
					display: "none",
				}}
			>
				{rfr}
			</div>
			{/* Toast Container */}
			<ToastContainer
				style={{
					zIndex: "10000",
				}}
				autoClose={3000}
				position="bottom-left"
			/>

			{/* ------------------ Modals ------------------ */}
			{/* Server Config Modal */}
			{manageModalId == 1 ? (
				<Modal
					open={manageModalId == 1}
					onClose={() => {
						setManageModalId(0);
					}}
				>
					<Modal.Header>
						<Text size={18}>Settings</Text>
					</Modal.Header>
					<Modal.Body>
						<Input
							placeholder="Server Name"
							value={managingServer.name}
							onChange={(e) => {
								let nms = {
									id: managingServer.id,
									name: e.target.value,
									port: managingServer.port,
									status: managingServer.status,
									version: managingServer.version,
									ram: managingServer.ram,
								};
								setManagingServer(nms);
							}}
						/>
						<Input
							placeholder="Server Port"
							type="number"
							min="1"
							max="65535"
							value={managingServer.port}
							onChange={(e) => {
								let nms = {
									id: managingServer.id,
									name: managingServer.name,
									port: Math.min(
										Math.max(parseInt(e.target.value), 1),
										65535
									),
									status: managingServer.status,
									version: managingServer.version,
									ram: managingServer.ram,
								};
								if (e.target.value == "") nms.port = 1;
								setManagingServer(nms);
							}}
						/>
						<Input
							placeholder="Server Ram (GB)"
							type="number"
							value={serverRam}
							onChange={(e) => {
								setServerRam(e.target.value);
							}}
						/>
						<Dropdown isOpen={versionMenuOpened}>
							<Dropdown.Button
								onClick={() => {
									if (versionMenuOpened)
										setVersionMenuOpened(false);
									else setVersionMenuOpened(true);
								}}
							>
								Version / {managingServer.version}
							</Dropdown.Button>
							<Dropdown.Menu
								onAction={(k) => {
									let nms = {
										id: managingServer.id,
										name: managingServer.name,
										port: managingServer.port,
										status: managingServer.status,
										version: k.toString(),
										ram: managingServer.ram,
									};
									setManagingServer(nms);
									setVersionMenuOpened(false);
								}}
								css={{
									maxHeight: "40vh",
								}}
								disabledKeys={["loading"]}
							>
								{MCVers.length == 0 ? (
									<Dropdown.Item key="loading">
										Loading...
									</Dropdown.Item>
								) : (
									MCVers.map((v) => {
										return (
											<Dropdown.Item key={v}>
												{v}
											</Dropdown.Item>
										);
									})
								)}
							</Dropdown.Menu>
						</Dropdown>
						<Text
							css={{
								wordBreak: "break-all",
							}}
						>
							Server UID : {managingServer.id}
						</Text>
					</Modal.Body>
					<Modal.Footer>
						<Button
							auto
							onPress={() => {
								ipcRenderer.send(
									ipc.Channels.OPEN_SERVER_FOLDER_REQ,
									managingServer.id
								);
							}}
						>
							Open Server Directory
						</Button>
						<Button
							auto
							color="success"
							disabled={
								MCVers.length == 0 ||
								managingServer.name.length <= 0 ||
								managingServer.port < 1 ||
								managingServer.port > 65535 ||
								serverRam.length <= 0 ||
								parseInt(serverRam).toString() != serverRam
							}
							onClick={() => {
								setManageModalId(0);
								let x = managingServer;
								x.ram = parseInt(serverRam);
								let sv = servers;
								sv[managingServerId] = x;
								setServers(sv);
								servers2 = sv;

								ipcRenderer.send(
									ipc.Channels.SERVER_LIST_SET_REQ,
									{
										servers: sv,
									}
								);
							}}
						>
							Save
						</Button>
					</Modal.Footer>
				</Modal>
			) : null}
			{/* Server Console Modal */}
			{manageModalId == 2 ? (
				<Modal
					open={manageModalId == 2}
					onClose={() => {
						setManageModalId(0);
					}}
					width="80%"
				>
					<Modal.Header>
						<Text size={18}>Console</Text>
					</Modal.Header>
					<Modal.Body>
						<Button
							color={managingServer.status ? "error" : "success"}
							disabled={serverTurnRequest}
							onPress={() => {
								if (managingServer.status) {
									toast(
										"Please stop the server with stop command",
										{ type: "error" }
									);
									return;
								} else {
									setSTRQ(true);
									ipcRenderer.send(
										ipc.Channels.SERVER_ON_REQ,
										{
											id: managingServer.id,
										}
									);
								}
							}}
						>
							{!serverTurnRequest ? (
								<>
									Make{" "}
									{managingServer.status
										? "Offline"
										: "Online"}
								</>
							) : (
								<Loading
									type="points"
									color="currentColor"
									size="sm"
								/>
							)}
						</Button>
						<Card variant="bordered">
							<Card.Body>
								<div
									style={{
										overflowY: "scroll",
										maxHeight: "50vh",
										maxWidth: "95%",
									}}
								>
									{(
										logs[managingServer.id] ||
										"No logs for now"
									)
										.split("\n")
										.map((v, i) => {
											return (
												<Text
													style={{
														wordBreak: "break-all",
													}}
												>
													{v}
												</Text>
											);
										})}
								</div>
							</Card.Body>
							<Card.Divider />
							<Card.Footer>
								<Grid.Container>
									<Grid xs={7.5}>
										<Input
											placeholder="Console command"
											width="97%"
											clearable
											disabled={!managingServer.status}
											value={consoleCommand}
											onChange={(e) => {
												setConsoleCommand(
													e.target.value
												);
											}}
										/>
									</Grid>
									<Grid xs={2}>
										<Button
											color="primary"
											auto
											disabled={!managingServer.status}
											onPress={() => {
												ipcRenderer.send(
													ipc.Channels.SERVER_COMMAND,
													{
														command: consoleCommand,
														id: managingServer.id,
													}
												);
												setConsoleCommand("");
											}}
										>
											Send!
										</Button>
									</Grid>
									<Grid xs={2}>
										<Button
											color="primary"
											auto
											onPress={() => {
												let logse = logs;
												logse[managingServer.id] = "";
												setLogs(logse);
												setRFR(uid());
											}}
										>
											Clear Log
										</Button>
									</Grid>
								</Grid.Container>
							</Card.Footer>
						</Card>
					</Modal.Body>
				</Modal>
			) : null}
			{/* Server Add Modal */}
			{manageModalId == 3 ? (
				<Modal
					open={manageModalId == 3}
					scroll
					blur
					preventClose={addRequested}
					onClose={() => {
						setVersionMenuOpened(false);
						if (MCVers.length > 0) {
							setServerVersion(MCVers.at(-1) as string);
						}
						setServerPort(25565);
						setServerName("");
						setManageModalId(0);
					}}
					onOpen={() => {
						setVersionMenuOpened(false);
						if (MCVers.length > 0) {
							setServerVersion(MCVers.at(-1) as string);
						}
						setServerPort(25565);
						setServerName("");
						setServerRam("");
					}}
				>
					<Modal.Header>
						<Text id="modal-title" size={20}>
							Add Server
						</Text>
					</Modal.Header>
					<Modal.Body>
						<Input
							placeholder="Server Name"
							value={serverName}
							onChange={(e) => {
								setServerName(e.target.value);
							}}
						/>
						<Input
							placeholder="Server Port"
							type="number"
							min="1"
							max="65535"
							value={serverPort}
							onChange={(e) => {
								setServerPort(
									Math.min(
										Math.max(parseInt(e.target.value), 1),
										65535
									)
								);
								if (e.target.value == "") setServerPort(1);
							}}
						/>
						<Input
							placeholder="Server Ram (GB)"
							type="number"
							value={serverRam}
							onChange={(e) => {
								setServerRam(e.target.value);
							}}
						/>
						<Dropdown isOpen={versionMenuOpened}>
							<Dropdown.Button
								onClick={() => {
									if (versionMenuOpened)
										setVersionMenuOpened(false);
									else setVersionMenuOpened(true);
								}}
							>
								Version / {serverVersion}
							</Dropdown.Button>
							<Dropdown.Menu
								onAction={(k) => {
									setServerVersion(k.toString());
									setVersionMenuOpened(false);
								}}
								css={{
									maxHeight: "40vh",
								}}
								disabledKeys={["loading"]}
							>
								{MCVers.length == 0 ? (
									<Dropdown.Item key="loading">
										Loading...
									</Dropdown.Item>
								) : (
									MCVers.map((v) => {
										return (
											<Dropdown.Item key={v}>
												{v}
											</Dropdown.Item>
										);
									})
								)}
							</Dropdown.Menu>
						</Dropdown>
					</Modal.Body>
					<Modal.Footer>
						<Button
							auto
							color="success"
							disabled={
								MCVers.length == 0 ||
								serverName.length <= 0 ||
								serverPort < 1 ||
								serverPort > 65535 ||
								addRequested ||
								serverRam.toString().length == 0 ||
								parseInt(serverRam).toString() != serverRam
							}
							onClick={() => {
								let x: ipc.SERVER_ADD_REQ_PAYLOAD = {
									server: {
										id: "",
										name: serverName,
										port: serverPort,
										status: false,
										version: serverVersion,
										ram: parseInt(serverRam),
									},
								};
								ipcRenderer.send(
									ipc.Channels.SERVER_ADD_REQ,
									x
								);
								setAddRequested(true);
							}}
						>
							Add
						</Button>
					</Modal.Footer>
				</Modal>
			) : null}
			{manageModalId == 4 ? (
				<Modal
					open={manageModalId == 4}
					blur
					preventClose={addRequested}
					onClose={() => {
						setVersionMenuOpened(false);
						if (MCVers.length > 0) {
							setServerVersion(MCVers.at(-1) as string);
						}
						setServerPort(25565);
						setServerName("");
						setManageModalId(0);
					}}
					onOpen={() => {
						setVersionMenuOpened(false);
						if (MCVers.length > 0) {
							setServerVersion(MCVers.at(-1) as string);
						}
						setServerPort(25565);
						setServerName("");
						setServerRam("");
						setServerDir("");
					}}
				>
					<Modal.Header>
						<Text id="modal-title" size={20}>
							Import server
						</Text>
					</Modal.Header>
					<Modal.Body>
						<Grid.Container
							css={{
								marginBottom: "20px",
							}}
						>
							<Grid xs={7.35}>
								<Popover placement="top">
									<Popover.Trigger>
										<Input
											readOnly
											placeholder="Server directory"
											width="80%"
											value={serverDir.slice(0, 40)}
											style={{
												cursor: "pointer",
											}}
										/>
									</Popover.Trigger>
									<Popover.Content>
										<Card
											css={{
												mw: "400px",
												background: `${theme?.colors.primary}`,
											}}
											color="invert"
										>
											<Card.Body
												css={{
													padding: "20px",
													marginRight: "20px",
												}}
											>
												<Text
													css={{
														wordBreak: "break-all",
														width: "90%",
														color: "white",
													}}
												>
													{serverDir == ""
														? "Server Directory is empty"
														: serverDir}
												</Text>
											</Card.Body>
										</Card>
									</Popover.Content>
								</Popover>
							</Grid>
							<Grid xs={4} justify="center">
								<Button
									auto
									onPress={() => {
										ipcRenderer.send(
											ipc.Channels.SERVER_DIR_DIALOG_REQ
										);
									}}
								>
									Set server directory
								</Button>
							</Grid>
						</Grid.Container>
						<Input
							placeholder="Server Name"
							value={serverName}
							onChange={(e) => {
								setServerName(e.target.value);
							}}
						/>
						<Input
							placeholder="Server Port"
							type="number"
							min="1"
							max="65535"
							value={serverPort}
							onChange={(e) => {
								setServerPort(
									Math.min(
										Math.max(parseInt(e.target.value), 1),
										65535
									)
								);
								if (e.target.value == "") setServerPort(1);
							}}
						/>
						<Input
							placeholder="Server Ram (GB)"
							type="number"
							value={serverRam}
							onChange={(e) => {
								setServerRam(e.target.value);
							}}
						/>
						<Dropdown isOpen={versionMenuOpened}>
							<Dropdown.Button
								onClick={() => {
									if (versionMenuOpened)
										setVersionMenuOpened(false);
									else setVersionMenuOpened(true);
								}}
							>
								Version / {serverVersion}
							</Dropdown.Button>
							<Dropdown.Menu
								onAction={(k) => {
									setServerVersion(k.toString());
									setVersionMenuOpened(false);
								}}
								css={{
									maxHeight: "40vh",
								}}
								disabledKeys={["loading"]}
							>
								{MCVers.length == 0 ? (
									<Dropdown.Item key="loading">
										Loading...
									</Dropdown.Item>
								) : (
									MCVers.map((v) => {
										return (
											<Dropdown.Item key={v}>
												{v}
											</Dropdown.Item>
										);
									})
								)}
							</Dropdown.Menu>
						</Dropdown>
					</Modal.Body>
					<Modal.Footer>
						<Button
							auto
							color="success"
							disabled={
								MCVers.length == 0 ||
								serverName.length <= 0 ||
								serverPort < 1 ||
								serverPort > 65535 ||
								addRequested ||
								serverRam.toString().length == 0 ||
								parseInt(serverRam).toString() != serverRam ||
								serverDir == "" ||
								serverDir == undefined ||
								serverDir == null
							}
							onClick={() => {
								let x: ipc.SERVER_IMPORT_REQ_PAYLOAD = {
									server: {
										id: "",
										name: serverName,
										port: serverPort,
										status: false,
										version: serverVersion,
										ram: parseInt(serverRam),
									},
									dir: serverDir,
								};
								ipcRenderer.send(
									ipc.Channels.SERVER_IMPORT_REQ,
									x
								);
								setAddRequested(true);
							}}
						>
							Add
						</Button>
					</Modal.Footer>
				</Modal>
			) : null}

			{/* ------------------ Base Uis ------------------ */}
			{/* Header Ui */}
			<header
				style={{
					borderBottom: `1px solid ${theme?.colors.neutralBorder}`,
				}}
			>
				<Text h1>OMSM</Text>
				<Text h6>Oein&rsquo;s Minecraft Server Manager</Text>
				<Text h6>You can make this app larger. View &gt; Zoom In</Text>
			</header>
			{/* Table Ui */}
			<article>
				<Grid.Container gap={2} justify="center">
					<Grid xs={10}>
						<Text h3>Your Servers</Text>
					</Grid>
					<Grid xs justify="flex-end">
						<Tooltip
							content="Add Server"
							placement="bottom"
							color="invert"
						>
							<AiOutlinePlus
								onClick={() => {
									setManageModalId(3);
								}}
								size="1.5rem"
							/>
						</Tooltip>
						<Tooltip
							content="Import exsisting Server"
							placement="bottom"
							color="invert"
						>
							<AiOutlineFolderAdd
								onClick={() => {
									setManageModalId(4);
								}}
								size="1.5rem"
							/>
						</Tooltip>
					</Grid>
				</Grid.Container>
				<Table
					shadow={false}
					color="secondary"
					css={{
						height: "auto",
						minWidth: "100%",
						marginTop: "0px",
						paddingTop: "0px",
					}}
				>
					<Table.Header>
						<Table.Column>Name</Table.Column>
						<Table.Column>Status</Table.Column>
						<Table.Column>Version</Table.Column>
						<Table.Column>Port</Table.Column>
						<Table.Column>Menu</Table.Column>
					</Table.Header>
					<Table.Body>
						{servers.map((v, i) => {
							return (
								<Table.Row key={i}>
									<Table.Cell>{v.name}</Table.Cell>
									<Table.Cell>
										{v.status ? "Online" : "Offline"}
									</Table.Cell>
									<Table.Cell>{v.version}</Table.Cell>
									<Table.Cell>{v.port}</Table.Cell>
									<Table.Cell>
										<Tooltip
											content="Settings"
											color="invert"
										>
											<AiOutlineSetting
												style={{
													transform:
														i == hovered
															? "rotate(90deg)"
															: "",
													transition: "ease .2s",
												}}
												size="22"
												onMouseEnter={() => {
													setHovered(i);
												}}
												onMouseLeave={() => {
													setHovered(-1);
												}}
												onClick={() => {
													setManagingServerId(i);
													setManageModalId(1);
													setManagingServer(
														servers[i]
													);
													setServerRam(
														servers[
															i
														].ram.toString()
													);
												}}
											/>
										</Tooltip>
										<Tooltip
											content="Console"
											color="invert"
										>
											<AiOutlineDesktop
												size="22"
												onClick={() => {
													setManagingServerId(i);
													setManageModalId(2);
													setManagingServer(
														servers[i]
													);
												}}
											/>
										</Tooltip>
										<Tooltip
											content="Remove"
											color="invert"
										>
											<AiOutlineDelete
												size="22"
												onClick={() => {
													if (
														servers[i].status ==
														true
													) {
														toast(
															"You can remove only offline servers.",
															{ type: "warning" }
														);
														return;
													}
													confirmAlert({
														title: "Are you sure?",
														message:
															"This action can not be undone.",
														buttons: [
															{
																label: `Remove server`,
																onClick: () => {
																	ipcRenderer.send(
																		ipc
																			.Channels
																			.SERVER_REMOVE_REQ,
																		servers[
																			i
																		].id
																	);
																},
															},
															{
																label: `Don't remove server`,
																onClick:
																	() => {},
															},
														],
													});
												}}
											/>
										</Tooltip>
									</Table.Cell>
								</Table.Row>
							);
						})}
					</Table.Body>
					<Table.Pagination
						shadow
						noMargin
						align="center"
						rowsPerPage={5}
					/>
				</Table>
			</article>
		</div>
	);
}

export default App;
