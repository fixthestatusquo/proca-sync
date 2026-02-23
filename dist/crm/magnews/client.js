
var __awaiter = (this && this.__awaiter) || ((thisArg, _arguments, P, generator) => {
    function adopt(value) { return value instanceof P ? value : new P((resolve) => { resolve(value); }); }
    return new (P || (P = Promise))((resolve, reject) => {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
});
var __importDefault = (this && this.__importDefault) || ((mod) => (mod && mod.__esModule) ? mod : { "default": mod });
Object.defineProperty(exports, "__esModule", { value: true });
exports.addContact = exports.setClientToken = exports.memberHash = void 0;
const crypto_1 = __importDefault(require("crypto"));
const magnews_1 = __importDefault(require("./magnews"));
const memberHash = (email) => {
    const hash = crypto_1.default.createHash("md5").update(email).digest("hex");
    return hash;
};
exports.memberHash = memberHash;
const setClientToken = () => {
    if (process.env.AUTH_TOKEN) {
        const tok = process.env.AUTH_TOKEN;
        if (!tok)
            throw Error("auth token is empty!");
        magnews_1.default.setConfig({
            accessToken: tok,
        });
        return magnews_1.default.getToken();
    }
    throw Error("Define AUTH_TOKEN");
};
exports.setClientToken = setClientToken;
const addContact = (token, member) => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield magnews_1.default.addListMember(token, member);
    return result;
});
exports.addContact = addContact;
