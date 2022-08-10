import React , { useState , useEffect } from 'react';

import { Text , Table , useTheme, Tooltip, Grid , Modal, Button, Input , Dropdown } from "@nextui-org/react";
import { AiOutlineSetting , AiOutlineDesktop , AiOutlinePlus } from "react-icons/ai";
const { ipcRenderer } = window.require("electron");
import * as ipc from "../common/types";
import { toast, ToastContainer } from 'react-toastify';
import { uid } from 'uid';

function App() {
  // Table
  const { theme } = useTheme();
  const [hovered, setHovered] = useState(-1);
  const [servers , setServers] = useState<ipc.Server[]>([]);

  // Versions
  const [versionMenuOpened , setVersionMenuOpened] = useState(false);
  const [MCVers , setMCVers] = useState<string[]>([]);

  // Add Menu
  const [serverName , setServerName] = useState("");
  const [serverPort , setServerPort] = useState(25565);
  const [serverVersion , setServerVersion] = useState("Loading...");
  const [serverAddOpened , setServerAddOpened] = useState(false);
  const [addRequested , setAddRequested] = useState(false);

  // Settings / Console
  const [manageModalId , setManageModalId] = useState(0);
  const [managingServerId , setManagingServerId] = useState(-1);
  const [managingServer , setManagingServer] = useState<ipc.Server>({
    id: "",name:"",port:0,status:false,version:""
  });
  const [rfr , setRFR] = useState("");

  useEffect(() => {
    ipcRenderer.send(ipc.Channels.SERVER_LIST_REQ , "");
    ipcRenderer.send(ipc.Channels.PAPER_VERSION_LIST_REQ , "");

    ipcRenderer.on(ipc.Channels.SERVER_LIST_RES , (e, slrp: ipc.Server[]) => {
      console.log(slrp);
      setServers(slrp);
    });

    ipcRenderer.on(ipc.Channels.PAPER_VERSION_LIST_RES , (e, slrp: ipc.PAPER_VERSION_LIST_RES_PAYLOAD) => {
        if(!slrp.error) {
          setMCVers(slrp.versions);
          setServerVersion(slrp.versions.at(-1) as string);
        }else{
          toast("Error occurred while fetching mc versions : " + slrp.error_message , {type: "error"});
        }
    });

    ipcRenderer.on(ipc.Channels.TOAST_REQ , (e , d: ipc.TOAST_REQ_PAYLOAD) => {
      toast(d.msg , {type: d.type});
    });

    ipcRenderer.on(ipc.Channels.SERVER_ADD_RES , (e) => {
      setServerAddOpened(false);
      ipcRenderer.send(ipc.Channels.SERVER_LIST_REQ , "");
    })
  } , []);

  return (
    <div style={{
      margin: "10px",
      height: "calc(100vh-20px)"
    }}>
      <div style={{
        display: "none",
      }}>{rfr}</div>
      <ToastContainer style={{
        zIndex: "10000"
      }} autoClose={3000} position="bottom-left" />
      <Modal 
          open={serverAddOpened}
          scroll
          blur
          preventClose={addRequested}
          onClose={() => {
            setVersionMenuOpened(false);
            if(MCVers.length > 0) {
              setServerVersion(MCVers.at(-1) as string);
            }
            setServerPort(25565);
            setServerName("");
            setServerAddOpened(false);
          }}

          onOpen={() => {
            setVersionMenuOpened(false);
            if(MCVers.length > 0) {
              setServerVersion(MCVers.at(-1) as string);
            }
            setServerPort(25565);
            setServerName("");
          }}
      >
          <Modal.Header>
              <Text id="modal-title" size={20}>
                  Add Server
              </Text>
          </Modal.Header>
          <Modal.Body>
              <Input placeholder='Server Name' value={serverName} onChange={(e) => {
                setServerName(e.target.value);
              }} />
              <Input placeholder='Server Port' type="number" min="1" max="65535" value={serverPort} onChange={(e) => {
                setServerPort(Math.min(Math.max(parseInt(e.target.value) , 1) , 65535));
                if(e.target.value == "") setServerPort(1);
              }} />
              <Dropdown isOpen={versionMenuOpened}>
                <Dropdown.Button onClick={() => {
                  if(versionMenuOpened) setVersionMenuOpened(false)
                  else setVersionMenuOpened(true)
                }}
                >Version / {serverVersion}</Dropdown.Button>
                <Dropdown.Menu onAction={(k) => {
                  setServerVersion(k.toString());
                  setVersionMenuOpened(false);
                }} css={{
                  maxHeight: "40vh",
                }} disabledKeys={["loading"]}>
                  {
                    MCVers.length == 0 ? <Dropdown.Item key="loading">Loading...</Dropdown.Item> : (
                      MCVers.map((v) => {
                        return <Dropdown.Item key={v}>{v}</Dropdown.Item>
                      })
                    )
                  }
                </Dropdown.Menu>
              </Dropdown>
          </Modal.Body>
          <Modal.Footer>
            <Button auto color="success" disabled={
              MCVers.length == 0 ||
              serverName.length <= 0 ||
              serverPort < 1 ||
              serverPort > 65535 ||
              addRequested
            } onClick={() => {
              let x: ipc.SERVER_ADD_REQ_PAYLOAD = {
                server: {
                  id: "",
                  name: serverName,
                  port: serverPort,
                  status: false,
                  version: serverVersion,
                }
              };
              ipcRenderer.send(ipc.Channels.SERVER_ADD_REQ , x);
              setAddRequested(true);
            }}>Add</Button>
          </Modal.Footer>
      </Modal>
      {manageModalId == 1 ? <Modal open={manageModalId == 1} onClose={() => {
        setManageModalId(0);
      }}>
        <Modal.Header>
          <Text size={18}>
            Settings
          </Text>
        </Modal.Header>
        <Modal.Body>
          <Input placeholder='Server Name' value={managingServer.name} onChange={(e) => {
            let nms = {
              id: managingServer.id,
              name: e.target.value,
              port: managingServer.port,
              status: managingServer.status,
              version: managingServer.version
            };
            setManagingServer(nms);
          }} />
          <Input placeholder='Server Port' type="number" min="1" max="65535" value={managingServer.port} onChange={(e) => {
            let nms = {
              id: managingServer.id,
              name: managingServer.name,
              port: Math.min(Math.max(parseInt(e.target.value) , 1) , 65535),
              status: managingServer.status,
              version: managingServer.version
            };
            if(e.target.value == "") nms.port = 1;
            setManagingServer(nms);
          }} />
          <Dropdown isOpen={versionMenuOpened}>
            <Dropdown.Button onClick={() => {
              if(versionMenuOpened) setVersionMenuOpened(false)
              else setVersionMenuOpened(true)
            }}
            >Version / {managingServer.version}</Dropdown.Button>
            <Dropdown.Menu onAction={(k) => {
              let nms = {
                id: managingServer.id,
                name: managingServer.name,
                port: managingServer.port,
                status: managingServer.status,
                version: k.toString(),
              };
              setManagingServer(nms);
              setVersionMenuOpened(false);
            }} css={{
              maxHeight: "40vh",
            }} disabledKeys={["loading"]}>
              {
                MCVers.length == 0 ? <Dropdown.Item key="loading">Loading...</Dropdown.Item> : (
                  MCVers.map((v) => {
                    return <Dropdown.Item key={v}>{v}</Dropdown.Item>
                  })
                )
              }
              </Dropdown.Menu>
            </Dropdown>
            <Text css={{
              wordBreak: "break-all"
            }}>Server UID : {managingServer.id}</Text>
          </Modal.Body>
          <Modal.Footer>
            <Button auto color="success" disabled={
              MCVers.length == 0 ||
              servers[managingServerId].name.length <= 0 ||
              servers[managingServerId].port < 1 ||
              servers[managingServerId].port > 65535
            } onClick={() => {
              setManageModalId(0);
              let sv = servers;
              sv[managingServerId] = managingServer;
              setServers(sv);
              
              ipcRenderer.send(ipc.Channels.SERVER_LIST_SET_REQ , {
                servers: sv,
              })
            }}>Save</Button>
          </Modal.Footer>
      </Modal> : null}
      {manageModalId == 2 ? <Modal open={manageModalId == 2} onClose={() => {
        setManageModalId(0);
      }}>
        <Modal.Header>
          <Text size={18}>
            Console
          </Text>
        </Modal.Header>
        <Modal.Body></Modal.Body>
      </Modal> : null}
      <header style={{
        borderBottom: `1px solid ${theme?.colors.neutralBorder}`
      }}>
        <Text h1>OMSM</Text>
        <Text h6>Oein&rsquo;s Minecraft Server Manager</Text>
      </header>
      <article>
        <Grid.Container gap={2} justify="center">
          <Grid xs={10}>
            <Text h3>Your Servers</Text>
          </Grid>
          <Grid xs justify='flex-end'>
            <Tooltip content="Add Server" placement="left" color="invert">
              <AiOutlinePlus onClick={() => {
                setServerAddOpened(true);
              }} />
            </Tooltip>
          </Grid>
        </Grid.Container>
        <Table
          shadow={false}
          color="secondary"
          css={{
            height: "auto",
            minWidth: "100%",
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
            {
              servers.map((v , i) => {
                return <Table.Row key={i}>
                  <Table.Cell>{v.name}</Table.Cell>
                  <Table.Cell>{v.status ? "Online" : "Offline"}</Table.Cell>
                  <Table.Cell>{v.version}</Table.Cell>
                  <Table.Cell>{v.port}</Table.Cell>
                  <Table.Cell>
                    <Tooltip content="Settings" color="invert">
                      <AiOutlineSetting style={{
                        transform: i == hovered ? "rotate(90deg)" : "",
                        transition: "ease .2s"
                      }} size="22" onMouseEnter={() => {
                        setHovered(i);
                      }} onMouseLeave={() => {
                        setHovered(-1);
                      }} onClick={() => {
                        setManagingServerId(i);
                        setManageModalId(1);
                        setManagingServer(servers[i]);
                      }} />
                    </Tooltip>
                    <Tooltip content="Console" color="invert">
                      <AiOutlineDesktop style={{
                        transition: "ease .2s"
                      }} size="22" onClick={() => {
                        setManagingServerId(i);
                        setManageModalId(2);
                        setManagingServer(servers[i]);
                      }} />
                    </Tooltip>
                  </Table.Cell>
                </Table.Row>
              })
            }
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

