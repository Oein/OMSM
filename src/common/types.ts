import { TypeOptions } from "react-toastify";

export enum Channels {
    SERVER_LIST_REQ="SLQ",
    SERVER_LIST_RES="SLR",
    SERVER_LIST_SET_REQ="SLSQ",
    SERVER_LOG="SL",
    SERVER_COMMAND="SCR",
    PAPER_VERSION_LIST_REQ="PVLQ",
    PAPER_VERSION_LIST_RES="PVLR",
    SERVER_ADD_REQ="SAQ",
    SERVER_ADD_RES="SAR",
    TOAST_REQ="TQ",
    SERVER_ON_REQ="SOQ",
    SERVER_ON_RES="SOR",
    SERVER_OFF_REQ="SFQ",
    SERVER_OFF_RES="SFR",
    SERVER_REMOVE_REQ="SRRQ",
    SERVER_REMOVE_RES="SRRR",
    OPEN_SERVER_FOLDER_REQ="OSFQ",
    OPEN_SERVER_FOLDER_RES="OSFR",
};

// --------------------- Payloads --------------------- \\

export interface SERVER_LIST_RES_PAYLOAD {
    servers: Server[];
};

export interface SERVER_LIST_SET_REQ_PAYLOAD {
    servers: Server[];
};

export interface SERVER_LOG_PAYLOAD {
    message: string; // log
    id: string; // 서버 uid
};

export interface SERVER_COMMAND_PAYLOAD {
    command: string; // command
    id: string; // 서버 uid
};

export interface PAPER_VERSION_LIST_RES_PAYLOAD {
    versions: string[];
    error: boolean;
    error_message: string;
};

export interface SERVER_ADD_REQ_PAYLOAD {
    server: Server;
};

export interface TOAST_REQ_PAYLOAD {
    msg: string;
    type: TypeOptions;
};

export interface SERVER_ON_REQ_PAYLOAD {
    id: string;
};

export interface SERVER_OFF_REQ_PAYLOAD {
    id: string;
};

export interface SERVER_REMOVE_REQ_PAYLOAD {
    id: string;
};

// --------------------- Common Types --------------------- \\
export interface Server {
    name: string; // 서버 이름
    id: string; // 서버 uid
    port: number; // 서버 포트
    status: boolean; // 서버 켜짐 / 꺼짐
    version: string; // MC 버전
    ram: number; // Ram (GB)
};