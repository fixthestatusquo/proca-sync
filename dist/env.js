"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnv = void 0;
const node_fs_1 = require("node:fs");
const node_util_1 = require("node:util");
// stand-in for dotenv.config(): vars already in process.env win, a missing file is not an error
const loadEnv = (path = ".env") => {
    if (!(0, node_fs_1.existsSync)(path))
        return {};
    const parsed = (0, node_util_1.parseEnv)((0, node_fs_1.readFileSync)(path, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
        if (process.env[key] === undefined)
            process.env[key] = value;
    }
    return parsed;
};
exports.loadEnv = loadEnv;
