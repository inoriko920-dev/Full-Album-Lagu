import { contextBridge } from "electron";
import { lfaBridge } from "./api";

contextBridge.exposeInMainWorld("lfa", lfaBridge);
