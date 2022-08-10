import { TypeOptions } from "react-toastify";

export enum Channels {
    SERVER_LIST_REQ="SLQ",
    SERVER_LIST_RES="SLR",
    SERVER_LIST_SET_REQ="SLSQ",
    SERVER_CONFIG_SET_REQ="SCQ",
    SERVER_CONFIG_SET_RES="SCR",
    SERVER_CONFIG_GET_REQ="SCGQ",
    SERVER_CONFIG_GET_RES="SCGR",
    SERVER_LOG="SL",
    SERVER_COMMAND="SCR",
    PAPER_VERSION_LIST_REQ="PVLQ",
    PAPER_VERSION_LIST_RES="PVLR",
    SERVER_ADD_REQ="SAQ",
    SERVER_ADD_RES="SAR",
    TOAST_REQ="TQ",
};

// --------------------- Payloads --------------------- \\

export interface SERVER_LIST_RES_PAYLOAD {
    servers: Server[];
};

export interface SERVER_LIST_SET_REQ_PAYLOAD {
    servers: Server[];
}

export interface SERVER_CONFIG_SET_REQ_PAYLOAD {
    server: Server; // 서버 config
};

export interface SERVER_CONFIG_SET_RES_PAYLOAD {
    error: boolean; // 에러가 있는지
    errorMsg: string; // 에러 메시지
};

export interface SERVER_CONFIG_GET_REQ_PAYLOAD {
    id: string; // 서버 uid
};

export interface SERVER_CONFIG_GET_RES_PAYLOAD {
    server: Server; // 서버 config
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

// --------------------- Common Types --------------------- \\
export interface Server {
    name: string; // 서버 이름
    id: string; // 서버 uid
    port: number; // 서버 포트
    status: boolean; // 서버 켜짐 / 꺼짐
    version: string; // MC 버전
};