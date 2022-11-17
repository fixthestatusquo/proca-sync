"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeDumpHandler = void 0;
const fs_1 = __importDefault(require("fs"));
// Dump to file handler
const makeDumpHandler = (filename) => {
    const fd = fs_1.default.openSync(filename, 'w');
    const handler = (actionOrEvent) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const line = JSON.stringify(actionOrEvent) + "\n";
        if (actionOrEvent.schema === 'proca:action:2') {
            console.log(`${actionOrEvent.actionId}. Action ${actionOrEvent.action.actionType} email ${actionOrEvent.contact.email}`);
        }
        else {
            console.log(`${actionOrEvent.eventType} event for ${(_b = (_a = actionOrEvent.supporter) === null || _a === void 0 ? void 0 : _a.contact) === null || _b === void 0 ? void 0 : _b.email}`);
        }
        fs_1.default.writeSync(fd, line);
    });
    return handler;
};
exports.makeDumpHandler = makeDumpHandler;
